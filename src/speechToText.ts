import config from 'config'
import { SpeechClient } from '@google-cloud/speech'
import { Promise } from 'es6-promise'

const client = new SpeechClient({
  keyFilename: `${process.cwd()}/.credentials/gcp.json`,
})

export type SpeechToTextOptions = {
  sampleRate: number,
}

export function speechToText(audioContent: Buffer, opts: SpeechToTextOptions): Promise<string> {
  return client
    .recognize({
      config: {
        encoding: 'OGG_OPUS',
        sampleRateHertz: opts.sampleRate,
        languageCode: config.get<string>('google_speech.language'),
      },
      audio: {
        content: audioContent.toString('base64'),
      },
    })
    .then(data => {
      return data[0].results
        .map(result => result.alternatives[0].transcript)
        .join('\n')
    })
}