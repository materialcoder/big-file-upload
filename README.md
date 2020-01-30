## 大文件切片上传

1. 对文件进行切片，并按文件名和数组下标进行顺序标记
2. 上传切片，异步长传所有切片
3. 上传完毕后，通知后端合并切片
4. 后端接受到请求后，读取所有切片，并按数组下标进行排序后进行合并
5. 合并完成后删除切片和切片文件夹，整个大文件上传完成

### 上传进度
可以使用XMLHttpRequest的uploaad.onprogress进行监听每个切片的上传进度，所有切片的上传进度加起来就等于整个文件的上传进度。

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
