package expo.modules.afterhourstap

import android.app.Activity
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.cardemulation.CardEmulation
import android.nfc.tech.IsoDep
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread

// Tap phones to connect. While afterhours is on screen this phone is both a card (see
// TapCardService) and a reader: it listens for another phone's card, asks it for its
// handle over afterhours' own channel and leaves its own. JS hears "onTap" either way:
// role "read" when this phone read the other, "card" when the other phone read this one.
// Reading uses foreground dispatch, not reader mode: reader mode switches the phone's own
// card off, and then two phones could never find each other.
class AfterhoursTapModule : Module() {
  private var wanted = false
  private var onScreen = true

  override fun definition() = ModuleDefinition {
    Name("AfterhoursTap")
    Events("onTap")

    OnCreate {
      TapState.listener = { handle -> sendEvent("onTap", mapOf("handle" to handle, "role" to "card")) }
    }
    OnDestroy {
      TapState.listener = null
      TapState.active = false
    }

    Function("isSupported") {
      val ctx = appContext.reactContext ?: return@Function false
      NfcAdapter.getDefaultAdapter(ctx) != null && ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    }
    Function("isEnabled") {
      val ctx = appContext.reactContext ?: return@Function false
      NfcAdapter.getDefaultAdapter(ctx)?.isEnabled == true
    }
    // handle null: off (a guest, or the setting is off)
    Function("setCard") { handle: String?, url: String? ->
      TapState.handle = handle
      TapState.url = url
      wanted = handle != null
      apply()
    }

    OnActivityEntersForeground {
      onScreen = true
      apply()
    }
    OnActivityEntersBackground {
      onScreen = false
      apply()
    }
    OnNewIntent { intent ->
      val tag: Tag? = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java) else @Suppress("DEPRECATION") intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
      if (tag != null && TapState.active) read(tag)
    }
  }

  private fun apply() {
    val on = wanted && onScreen
    TapState.active = on
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      try {
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return@runOnUiThread
        val emulation = CardEmulation.getInstance(adapter)
        val service = ComponentName(activity, TapCardService::class.java)
        if (on) {
          emulation.setPreferredService(activity, service)
          adapter.enableForegroundDispatch(activity, pending(activity), null, arrayOf(arrayOf(IsoDep::class.java.name)))
        } else {
          emulation.unsetPreferredService(activity)
          adapter.disableForegroundDispatch(activity)
        }
      } catch (_: Exception) {
        // the activity was not resumed yet, or NFC is off: the next foreground tries again
      }
    }
  }

  private fun pending(activity: Activity): PendingIntent {
    val intent = Intent(activity, activity.javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
    return PendingIntent.getActivity(activity, 0, intent, flags)
  }

  // The other phone, over afterhours' own channel. Anything else (a bank card, a transit
  // pass, a phone without the app open) does not answer the select and is left alone.
  private fun read(tag: Tag) {
    val iso = IsoDep.get(tag) ?: return
    thread {
      try {
        iso.connect()
        iso.timeout = 1500
        val select = byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, TapState.PRIVATE_AID.size.toByte()) + TapState.PRIVATE_AID + byteArrayOf(0x00)
        if (!ok(iso.transceive(select))) return@thread
        val got = iso.transceive(byteArrayOf(0x80.toByte(), TapState.INS_GET, 0x00, 0x00, 0x00))
        if (!ok(got)) return@thread
        val other = String(got.copyOf(got.size - 2), Charsets.UTF_8).trim()
        TapState.handle?.let { mine ->
          val bytes = mine.toByteArray(Charsets.UTF_8)
          try {
            iso.transceive(byteArrayOf(0x80.toByte(), TapState.INS_PUT, 0x00, 0x00, bytes.size.toByte()) + bytes)
          } catch (_: Exception) {}
        }
        if (other.isNotEmpty()) sendEvent("onTap", mapOf("handle" to other, "role" to "read"))
      } catch (_: Exception) {
      } finally {
        try {
          iso.close()
        } catch (_: Exception) {}
      }
    }
  }

  private fun ok(r: ByteArray) = r.size >= 2 && r[r.size - 2] == 0x90.toByte() && r[r.size - 1] == 0x00.toByte()
}
