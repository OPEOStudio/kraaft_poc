import { createOggProcessor } from '../ogg'

test('test', () => {
  const ogg = createOggProcessor({ sampleRate: 16000, packetDuration: 60, serial: 12345 })
  ogg.push(Buffer.alloc(255, 0))
  ogg.push(Buffer.alloc(255, 1))

  const actual = ogg.process().toString('hex')

  const expected = [
    '4f676753000200000000000000003930000000000000f0306d6d0113', // Ogg page header
    '4f7075734865616401010000803e0000000000', // Ogg Opus Head
    '4f67675300000000000000000000393000000100000056b60f6a0114', // Ogg page header
    '4f70757354616773040000006463626100000000', // Ogg Opus Comment
    '4f6767530000400b0000000000003930000002000000ad52710001ff', // Ogg page header
    '00'.repeat(255), // Packet 1
    '4f6767530000801600000000000039300000030000005659485601ff', // Ogg page header
    '01'.repeat(255), // Packet 2
  ].join('')

  expect(actual).toEqual(expected)
})
