declare module '@google-cloud/speech' {
  import { Duplex } from 'stream'
  import { Promise } from 'es6-promise'

  export type Codec = 'ENCODING_UNSPECIFIED' | 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE'

  export type RequestConfig = {
    encoding: Codec,
    sampleRateHertz: number,
    languageCode: string,
  }

  export type StreamedRequest = {
    config: RequestConfig,
    interimResults: boolean,
  }

  export type Request = {
    audio: { content: string },
    config: RequestConfig,
  }

  export type Response = { results: { alternatives: { transcript: string }[] }[] }[]

  /**
   * Construct an instance of SpeechClient.
   *
   * @param {object} [options] - The configuration object. See the subsequent
   *   parameters for more details.
   * @param {object} [options.credentials] - Credentials object.
   * @param {string} [options.credentials.client_email]
   * @param {string} [options.credentials.private_key]
   * @param {string} [options.email] - Account email address. Required when
   *     using a .pem or .p12 keyFilename.
   * @param {string} [options.keyFilename] - Full path to the a .json, .pem, or
   *     .p12 key downloaded from the Google Developers Console. If you provide
   *     a path to a JSON file, the projectId option below is not necessary.
   *     NOTE: .pem and .p12 require you to specify options.email as well.
   * @param {number} [options.port] - The port on which to connect to
   *     the remote host.
   * @param {string} [options.projectId] - The project ID from the Google
   *     Developer's Console, e.g. 'grape-spaceship-123'. We will also check
   *     the environment variable GCLOUD_PROJECT for your project ID. If your
   *     app is running in an environment which supports
   *     {@link https://developers.google.com/identity/protocols/application-default-credentials Application Default Credentials},
   *     your project ID will be detected automatically.
   * @param {function} [options.promise] - Custom promise module to use instead
   *     of native Promises.
   * @param {string} [options.servicePath] - The domain name of the
   *     API remote host.
   */
  export type SpeechClientOptions = {
    keyFilename?: string
  }

  export class SpeechClient {
    constructor(options?: SpeechClientOptions)
    streamingRecognize(request: StreamedRequest): Duplex
    recognize(request: Request): Promise<Response>
  }
}