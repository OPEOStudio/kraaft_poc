
export type OggOptions = {
  sampleRate: number,
  packetDuration: number,
  serial?: number, // Useful for tests
}

export function createOggProcessor(options: OggOptions) {
  return new Ogg(options)
}

export interface OggProcessor {
  push(packet: Buffer): void
  process(): Buffer
}

class Ogg implements OggProcessor {
  private readonly queue: Buffer[] = []
  private readonly serial: number
  private readonly samplePerPacket: number
  private readonly checksumTable: number[]

  constructor(private options: OggOptions) {
    this.serial = options.serial || Math.ceil(Math.random() * Math.pow(2, 32))
    this.samplePerPacket = 48 * this.options.packetDuration
    this.checksumTable = this.initChecksumTable()
  }

  getHeaderPages(): Buffer[] {
    /* ID Header */
    const idHeader = this.getIDHeader()
    const idHeaderPage = this.getPage(idHeader, OggHeaderType.Beginning, 0)

    /* comment Header */
    const commentHeader = this.getCommentHeader()
    const commentHeaderPage = this.getPage(commentHeader, OggHeaderType.None, 1)
    return [idHeaderPage, commentHeaderPage]
  }

  getIDHeader(): Buffer {
    const data = Buffer.alloc(19)
    data.write('OpusHead', 0, 8, 'ASCII') // Magic Signature
    data.writeUInt8(1, 8) // Version
    data.writeUInt8(1, 9) // Channel count
    data.writeUInt16LE(0, 10) // pre-skip, don't need to skip any value
    data.writeUInt32LE(this.options.sampleRate, 12) // original sample rate, any valid sample e.g 8000
    data.writeUInt16LE(0, 16) // output gain
    data.writeUInt8(0, 18) // channel map 0 = one stream: mono or stereo
    return data
  }

  getCommentHeader(): Buffer {
    const data = Buffer.alloc(20)
    data.write('OpusTags', 0, 8, 'ASCII') // Magic Signature
    data.writeUInt32LE(4, 8) // Vendor Length
    data.writeUInt32LE(1633837924, 12) // Vendor name 'abcd'
    data.writeUInt32LE(0, 16) // User Comment List Length
    return data
  }

  getPage(segmentData: Buffer, headerType: OggHeaderType, index: number): Buffer {

    /* ref: https://xiph.org/ogg/doc/framing.html */
    const segmentTable = Buffer.alloc(1) // segment table stores segment length map. always providing one single segment
    const page = Buffer.alloc(27 + segmentTable.length + segmentData.length)
    segmentTable.writeUInt8(segmentData.length, 0)

    page.write('OggS', 0, 4, 'ASCII') // page headers starts with 'OggS'
    page.writeUInt8(0, 4) // Version
    page.writeUInt8(headerType, 5) // 1 = continuation, 2 = beginning of stream, 4 = end of stream

    // Granule position: More info here: https://tools.ietf.org/html/rfc7845.html#section-4
    const isHeaderPage = index < 2
    const granulePosition = isHeaderPage ? 0 : (index - 1) * this.samplePerPacket
    page.writeUInt32LE(granulePosition, 6)

    page.writeUInt32LE(0, 10)
    page.writeUInt32LE(this.serial, 14) // Bitstream serial number
    page.writeUInt32LE(index, 18) // Page sequence number
    page.writeUInt8(1, 26) // Number of segments in page, giving always 1 segment

    segmentTable.copy(page, 27) // Segment Table inserting at 27th position since page header length is 27
    segmentData.copy(page, 28) // inserting at 28th since Segment Table(1) + header length(27)
    page.writeUInt32LE(this.getChecksum(page), 22) // Checksum - generating for page data and inserting at 22th position into 32 bits

    return page
  }

  process(): Buffer {
    const queueLength = this.queue.length

    const output: Buffer[] = this.getHeaderPages()
    const headerPagesCount = output.length

    for (let i = 0; i < queueLength; i++) {
      const packet = this.queue[i]
      const headerType = i === queueLength ? OggHeaderType.End : OggHeaderType.None
      const segmentData = this.getPage(packet, headerType, i + headerPagesCount)
      output.push(segmentData)
    }

    return Buffer.concat(output)
  }

  /**
   * See page checksum section in https://xiph.org/ogg/doc/framing.html
   * @param {Buffer} data
   * @returns {number}
   */
  getChecksum(data: Buffer) {
    let checksum = 0
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum << 8) ^ this.checksumTable[((checksum >>> 24) & 0xff) ^ data[i]]
    }
    return checksum >>> 0
  }

  initChecksumTable(): number[] {
    const checksumTable: number[] = []
    for (let i = 0; i < 256; i++) {
      let r = i << 24
      for (let j = 0; j < 8; j++) {
        r = ((r & 0x80000000) !== 0) ? ((r << 1) ^ 0x04c11db7) : (r << 1)
      }
      checksumTable[i] = (r & 0xffffffff)
    }
    return checksumTable
  }

  push(packet: Buffer): void {
    this.queue.push(packet)
  }
}

/**
 * See header_type_flag section in https://xiph.org/ogg/doc/framing.html
 */
enum OggHeaderType {
  None = 0,
  Continuation = 1,
  Beginning = 2,
  End = 4,
}
