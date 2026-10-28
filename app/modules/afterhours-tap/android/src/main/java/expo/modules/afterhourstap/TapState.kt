package expo.modules.afterhourstap

// What this phone shows when another phone touches it. Shared by the module (which sets
// it while the app is on screen) and the card service (which answers the other phone).
object TapState {
  @Volatile var handle: String? = null
  @Volatile var url: String? = null
  // true only while afterhours is on screen and a handle is set: otherwise the card is silent
  @Volatile var active: Boolean = false
  // the other phone told us who it is (it read our card first)
  @Volatile var listener: ((String) -> Unit)? = null

  val PRIVATE_AID: ByteArray = byteArrayOf(0xF0.toByte(), 0x41, 0x46, 0x54, 0x45, 0x52, 0x48)
  val NDEF_AID: ByteArray = byteArrayOf(0xD2.toByte(), 0x76, 0x00, 0x00, 0x85.toByte(), 0x01, 0x01)
  const val INS_GET: Byte = 0xCA.toByte() // give me your handle
  const val INS_PUT: Byte = 0xDA.toByte() // here is mine
  val OK: ByteArray = byteArrayOf(0x90.toByte(), 0x00)
  val NOT_FOUND: ByteArray = byteArrayOf(0x6A, 0x82.toByte())
}
