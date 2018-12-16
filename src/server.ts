import config from 'config'
import { client } from 'websocket'
import logger from './logger'

const zelloAuthToken = config.get('zello.auth.dev_token')
const zelloNetwork = config.get('zello.network')
const zelloChannel = config.get('zello.channel')

logger.info('Application start')

const wsClient = new client()

wsClient.on('connectFailed', error => logger.error(`Connect Error: ${error}`))

wsClient.on('connect', (connection) => {
  logger.info('WebSocket Client Connected')

  connection.on('error', error => logger.error(`Connection Error: ${error}`))

  connection.on('close', () => logger.info('Connection Closed'))

  connection.on('message', (message) => {
    if (message.type === 'utf8' && message.utf8Data) {
      const body = JSON.parse(message.utf8Data)
      console.log(body)
    } else {
      console.log(message)
    }
  })

  connection.sendUTF(JSON.stringify({
    command: 'logon',
    seq: 1,
    auth_token: zelloAuthToken,
    channel: zelloChannel
  }))
})

wsClient.connect(`wss://zellowork.io/ws/${zelloNetwork}`)
