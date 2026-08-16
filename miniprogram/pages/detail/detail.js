// 商品详情页: 图/视频展示 + 生成商品卡片(保存相册发给商家)
const api = require('../../services/api')
const config = require('../../utils/config')

Page({
  data: {
    product: null,
    zoneName: '',
    generating: false
  },

  onLoad(options) {
    this.productId = options.id
    this.loadProduct()
  },

  // 转发给好友/群(带当前商品)
  onShareAppMessage() {
    const p = this.data.product
    return {
      title: (p ? p.name + ' - ' : '') + '珠珠童装',
      path: '/pages/detail/detail?id=' + this.productId
    }
  },

  // 分享到朋友圈(带当前商品)
  onShareTimeline() {
    const p = this.data.product
    return {
      title: (p ? p.name + ' - ' : '') + '珠珠童装',
      query: 'id=' + this.productId
    }
  },

  async loadProduct() {
    try {
      const p = await api.getProduct(this.productId)
      if (!p) {
        wx.showToast({ title: '商品不存在', icon: 'none' })
        return
      }
      const zone = config.ZONES.find(z => z.gender === p.gender && z.part === p.part)
      this.setData({
        product: p,
        zoneName: zone ? zone.name : ''
      })
      wx.setNavigationBarTitle({ title: p.name })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  // ---- 点击图片放大预览(支持双指缩放/左右滑动) ----
  onPreviewImage(e) {
    const current = e.currentTarget.dataset.src
    const urls = (this.data.product.media || [])
      .filter(m => m.type === 'image')
      .map(m => m.url)
    if (!urls.length) return
    wx.previewImage({ current, urls })
  },

  // ---- 保存商品图(直接保存甲方上传的原图, 无附加信息) ----
  async onSend() {
    const p = this.data.product
    if (!p) return
    if (this.data.generating) return
    this.setData({ generating: true })
    wx.showLoading({ title: '保存中...', mask: true })
    try {
      const src = p.cover   // 图片商品=原图; 视频商品=视频封面
      if (!src) throw new Error('该商品没有可保存的图片')
      const localPath = await ensureLocalPath(src)
      wx.hideLoading()
      await this.saveToAlbum(localPath)
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ generating: false })
    }
  },

  // 保存到相册(含授权处理)
  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          wx.showModal({
            title: '商品图已保存',
            content: '已保存到相册，请打开微信把这张图片发给商家，商家会按图片核对下单。',
            showCancel: false,
            confirmText: '好的'
          })
          resolve()
        },
        fail: (err) => {
          const msg = err.errMsg || ''
          if (msg.indexOf('auth') > -1 || msg.indexOf('denied') > -1) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许保存图片到相册，才能把商品图发给商家。',
              confirmText: '去设置',
              success: r => {
                if (r.confirm) wx.openSetting()
              }
            })
          } else {
            wx.showToast({ title: '保存失败: ' + msg, icon: 'none' })
          }
          reject(err)
        }
      })
    })
  }
})

// 确保是本地文件路径(云存储 fileID / 包内路径 / 网络路径先转本地)
function ensureLocalPath(src) {
  return new Promise((resolve, reject) => {
    if (typeof src === 'string' && src.indexOf('cloud://') === 0) {
      // 云存储文件: 先下载到本地临时路径
      wx.cloud.downloadFile({
        fileID: src,
        success: r => resolve(r.tempFilePath),
        fail: () => reject(new Error('图片下载失败'))
      })
    } else if (src.indexOf('wxfile://') === 0 || src.indexOf('http://') === 0 || src.indexOf('https://') === 0) {
      wx.getImageInfo({ src, success: r => resolve(r.path), fail: () => reject(new Error('图片加载失败')) })
    } else if (src.indexOf('/') === 0) {
      // 包内路径(/images/...) -> getImageInfo 转本地路径
      wx.getImageInfo({ src, success: r => resolve(r.path), fail: () => reject(new Error('图片加载失败')) })
    } else {
      resolve(src)
    }
  })
}
