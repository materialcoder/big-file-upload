const http = require('http')
const path = require('path')
const fse = require('fs-extra')
const multiparty = require('multiparty')

const server = http.createServer()
// 上传地址
const UPLOAD_PATH = path.resolve(__dirname, '..', 'target')

// 处理合并请求发送的数据
const resolvePost = req => {
  return new Promise(resolve => {
    let chunk = ''
    req.on('data', data => {
      chunk += data
    })
    req.on('end', () => {
      resolve(JSON.parse(chunk))
    })
  })
}

const pipeStream = (path, writeStream) => {
  console.log('正在写入：', path)
  return new Promise(resolve => {
    const readStream = fse.createReadStream(path)
    readStream.on('end', () => {
      fse.unlinkSync(path)
      resolve()
    })
    readStream.pipe(writeStream)
  })
}

// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
  // 切片路径
  console.log('切片路径', filePath)
  const chunkDir = path.resolve(UPLOAD_PATH, filename.split('.')[0])
  const chunkPaths = await fse.readdir(chunkDir)
  console.log('所有切片', chunkPaths)
  // 根据切片下标进行排序,否则直接读取目录的文件获取的顺序可能会错乱
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
  await Promise.all(
    chunkPaths.map((chunkPath, index) => {
      return pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        fse.createWriteStream(filePath, {
          start: index * size,
          end: (index + 1) * size
        })
      )
    })
  )
  // 合并完成后删除保存切片的目录
  console.log('合并完成，删除切片文件夹')
  fse.rmdirSync(chunkDir)
}

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.status = 200
    res.end()
    return
  }

  if (req.url === '/merge') {
    console.log('开始合并')
    // 处理合并请求传过来的数据（文件名）
    const data = await resolvePost(req)
    console.log('需要合并的文件：', data)
    const {filename, size} = data
    const filePath = path.resolve(UPLOAD_PATH, `${filename}`)
    // 合并文件
    await mergeFileChunk(filePath, filename, size)
    res.end('merged file chunk')
    return
  }

  const multipart = new multiparty.Form()
  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err)
      return
    }
    const [chunk] = files.chunk
    const [hash] = fields.hash
    const [filename] = fields.filename
    const chunkDir = path.resolve(UPLOAD_PATH, filename.split('.')[0])

    // console.log(chunk)
    // console.log(chunkDir)

    // 切片目录不存在的话，则创建目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir)
    }

    // fs-extra 专用方法，类似 fs.rename 并且跨平台
    await fse.move(chunk.path, `${chunkDir}/${hash}`)
    res.end('received file chunk')
  })
})

server.listen(3000, () => console.log('后台正在监听3000端口'))