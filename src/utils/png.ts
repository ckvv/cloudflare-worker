import { Buffer } from 'node:buffer'
import zlib from 'node:zlib'

// 计算 CRC32 校验
function calculateCRC(buffer: Buffer) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }

  let crc = 0xFFFFFFFF
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0 // 保证结果是无符号整数
}

export function createPng(width: number, height: number, color: { r: number, g: number, b: number }) {
  // PNG 文件头
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  // IHDR 数据块
  const ihdrChunk = (() => {
    const data = Buffer.alloc(13)
    data.writeUInt32BE(width, 0) // 宽度
    data.writeUInt32BE(height, 4) // 高度
    data[8] = 8 // 位深度
    data[9] = 2 // 颜色类型 (2 = Truecolor)
    data[10] = 0 // 压缩方法
    data[11] = 0 // 滤波方法
    data[12] = 0 // 交错方法
    return createChunk('IHDR', data)
  })()

  // 图像数据 (IDAT 数据块)
  const idatChunk = (() => {
    const rawImageData = []
    for (let y = 0; y < height; y++) {
      rawImageData.push(0) // 每行的滤波字节
      for (let x = 0; x < width; x++) {
        rawImageData.push(color.r, color.g, color.b) // RGB
      }
    }
    const compressedData = zlib.deflateSync(Buffer.from(rawImageData))
    return createChunk('IDAT', compressedData)
  })()

  // IEND 数据块
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  // 组合所有块
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type: string, data: Buffer) {
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0) // 数据长度
  chunk.write(type, 4) // 数据块类型
  data.copy(chunk, 8) // 数据内容
  const crc = calculateCRC(chunk.subarray(4, 8 + data.length)) // 计算 CRC 校验
  chunk.writeUInt32BE(crc, 8 + data.length) // 写入 CRC
  return chunk
}
