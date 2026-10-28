package expo.modules.afterhourstap

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

// The phone as a card. Two doors:
//  1. the standard NFC Forum tag (type 4): any phone that touches this one reads a link to
//     the person's page on the website (phones without afterhours open, iPhones too);
//  2. afterhours' own channel: another phone with the app open asks for the handle and
//     leaves its own, so both phones open each other's profile from one touch.
// Silent (file not found) whenever the app is not on screen.
class TapCardService : HostApduService() {
  private enum class Sel { NONE, NDEF_APP, CC, NDEF, PRIVATE }
  private var sel = Sel.NONE

  override fun processCommandApdu(apdu: ByteArray, extras: Bundle?): ByteArray {
    if (!TapState.active || apdu.size < 4) return TapState.NOT_FOUND
    val ins = apdu[1]
    val p1 = apdu[2].toInt() and 0xFF
    val p2 = apdu[3].toInt() and 0xFF
    return when {
      ins == 0xA4.toByte() && p1 == 0x04 -> selectApp(body(apdu))
      ins == 0xA4.toByte() && p1 == 0x00 -> selectFile(body(apdu))
      ins == 0xB0.toByte() -> readBinary((p1 shl 8) or p2, if (apdu.size > 4) apdu[4].toInt() and 0xFF else 0)
      sel == Sel.PRIVATE && ins == TapState.INS_GET -> (TapState.handle ?: "").toByteArray(Charsets.UTF_8) + TapState.OK
      sel == Sel.PRIVATE && ins == TapState.INS_PUT -> {
        val other = String(body(apdu), Charsets.UTF_8).trim()
        if (other.isNotEmpty()) TapState.listener?.invoke(other)
        TapState.OK
      }
      else -> TapState.NOT_FOUND
    }
  }

  override fun onDeactivated(reason: Int) {
    sel = Sel.NONE
  }

  private fun body(apdu: ByteArray): ByteArray {
    if (apdu.size < 6) return ByteArray(0)
    val lc = apdu[4].toInt() and 0xFF
    return apdu.copyOfRange(5, minOf(apdu.size, 5 + lc))
  }

  private fun selectApp(aid: ByteArray): ByteArray {
    sel = when {
      aid.contentEquals(TapState.NDEF_AID) -> Sel.NDEF_APP
      aid.contentEquals(TapState.PRIVATE_AID) && TapState.handle != null -> Sel.PRIVATE
      else -> return TapState.NOT_FOUND.also { sel = Sel.NONE }
    }
    return TapState.OK
  }

  private fun selectFile(id: ByteArray): ByteArray {
    if (sel == Sel.NONE || sel == Sel.PRIVATE || id.size != 2) return TapState.NOT_FOUND
    sel = when {
      id[0] == 0xE1.toByte() && id[1] == 0x03.toByte() -> Sel.CC
      id[0] == 0xE1.toByte() && id[1] == 0x04.toByte() -> Sel.NDEF
      else -> return TapState.NOT_FOUND
    }
    return TapState.OK
  }

  private fun readBinary(offset: Int, le: Int): ByteArray {
    val file = when (sel) {
      Sel.CC -> CC
      Sel.NDEF -> ndefFile(TapState.url ?: return TapState.NOT_FOUND)
      else -> return TapState.NOT_FOUND
    }
    if (offset > file.size) return TapState.NOT_FOUND
    val want = if (le == 0) 256 else le
    return file.copyOfRange(offset, minOf(file.size, offset + want)) + TapState.OK
  }

  companion object {
    // capability container: mapping 2.0, max read 0x3B, max write 0x34, one NDEF file E104
    // of up to 1 KB, readable, not writable
    private val CC = byteArrayOf(
      0x00, 0x0F, 0x20, 0x00, 0x3B, 0x00, 0x34,
      0x04, 0x06, 0xE1.toByte(), 0x04, 0x04, 0x00, 0x00, 0xFF.toByte(),
    )

    // one URI record (short record, well known type "U"), the length in front
    fun ndefFile(url: String): ByteArray {
      val (prefix, rest) = when {
        url.startsWith("https://") -> 0x04.toByte() to url.removePrefix("https://")
        url.startsWith("http://") -> 0x03.toByte() to url.removePrefix("http://")
        else -> 0x00.toByte() to url
      }
      val payload = byteArrayOf(prefix) + rest.toByteArray(Charsets.UTF_8)
      val record = byteArrayOf(0xD1.toByte(), 0x01, payload.size.toByte(), 0x55) + payload
      return byteArrayOf((record.size shr 8).toByte(), (record.size and 0xFF).toByte()) + record
    }
  }
}
