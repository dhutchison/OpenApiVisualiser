import { rmSync } from 'node:fs'

rmSync('coverage/OpenAPIVisualiser', {force: true, recursive: true})
