<template>
  <div id="app">
    <input type="file" @change="handleFileChange">
    <el-button  type="primary" size="small" @click="handleUpload">上传</el-button>
  </div>
</template>

<script>
const SIZE = 20 * 1024 * 1024  // 切片大小 10M
export default {
  name: 'app',
  data() {
    return {
      container: {
        file: null
      },
      data: []
    }
  },
  computed: {
    // 文件上传总进度
    uploadPercentage() {
      if (!this.container.file || !this.data.length) return
      const loaded = this.data.map(item => item.size * item.percentage).reduce((acc, cur) => acc + cur)
      return parseInt((loaded / this.container.file.size) * 100)
    }
  },
  methods: {
    // 点击上传按钮
    async handleUpload() {
      console.log('upload')
      if (!this.container.file) return
      // 1. 先对文件进行切片
      const fileChunkList = this.createFileChunk(this.container.file)
      // 2. 整理文件切片 以文件名+数组下标作为hash值
      this.data = fileChunkList.map(({file},index) => ({
        index,
        chunk: file,
        hash: this.container.file.name.split('.')[0] + '-' + index,
        percentage: 0
      }))
      // 3. 上传切片
      await this.uploadChunks()
      console.log('上传完成')
    },
    handleFileChange(e) {
      console.log('filechange')
      const [file] = e.target.files
      console.log(file)
      if (!file) return
      // this.$options.data() 初始的data
      // this.$data  修改赋值后的data
      // 重置data为初始的状态
      Object.assign(this.$data, this.$options.data())
      this.container.file = file
    },
    // 生成文件切片
    createFileChunk(file, size=SIZE) {
      const fileChunkList = []
      let cur = 0
      while (cur < file.size) {
        fileChunkList.push({file: file.slice(cur, cur + size)})
        cur += size
      }
      return fileChunkList
    },
    // 异步上传切片
    async uploadChunks() {
      // 1. 构造formData
      // 2. 异步上传
      const requestList = this.data.map(({chunk, hash, index}) => {
        const formData = new FormData()
        formData.append('chunk', chunk)
        formData.append('hash', hash)
        formData.append('filename', this.container.file.name)
        return {formData, index}
      }).map(async ({formData, index}) => {
        return this.request({
          url: 'http://localhost:3000',
          data: formData,
          onProgress: this.createProgressHandler(this.data[index])  // 每个切片有不同的进度监听
        })
      })
      // 3. 并发上传
      await Promise.all(requestList)
      // 4. 所有切片上传完成后通知后端合并切片
      await this.mergeRequest()
    },
    // 发送合并切片请求
    async mergeRequest() {
      await this.request({
        url: 'http://localhost:3000/merge',
        headers: {
          'content-type': 'application/json'
        },
        data:JSON.stringify({
          size: SIZE,
          filename: this.container.file.name
        })
      })
    },
    // 监听每个切片的上传进度
    createProgressHandler(chunk) {
      return e => {
        chunk.percentage = parseInt(String((e.loaded / e.total) * 100))
      }
    },
    request({
      url,
      method='post',
      data,
      headers={},
      onProgress = e => e,
      // requestList
    }) {
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest()
        // 监听上传进度
        xhr.upload.onprogress = onProgress
        xhr.open(method, url)
        // 对象遍历 常用for...in 
        Object.keys(headers).forEach(key => {
          console.log(key)
          xhr.setRequestHeader(key, headers[key])
        })
        xhr.send(data)
        xhr.onload = e => {
          resolve({
            data: e.target.response
          })
        }
      })
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
