
import { createLogger, transports, format } from 'winston'

const { timestamp, prettyPrint, printf, combine } = format

const logger = createLogger({
  format: combine(
    timestamp(),
    prettyPrint(),
    printf(({ timestamp, level, message }) => `${timestamp} - ${level.toUpperCase()} - ${message}`)
  ),
  transports: [
    new transports.Console(),
  ],
})

export default logger
