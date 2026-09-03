// 首页: 品牌标题 + 搜索 + 动态宣传图 + 四大专区入口卡片
const api = require('../../services/api')
const config = require('../../utils/config')

Page({
  data: {
    banners: [],
    brandName: config.BRAND_NAME,      // 品牌名(可配置)
    brandSlogan: config.BRAND_SLOGAN,  // 品牌标语(可配置)
    zones: config.ZONES,        // 专区入口卡片(静态, 来自配置)
    contactWechat: config.CONTACT_WECHAT,  // 商家微信号
    showContactPopup: false     // 联系商家弹窗开关
  },

  onLoad() {
    this.loadHome()
  },

  onShow() {
    // 商家上传新商品后返回首页, 刷新宣传图
    if (this._loaded) this.loadHome()
    this._loaded = true
  },

  // 转发给好友/群
  onShareAppMessage() {
    return { title: config.APP_NAME + ' - 精选好物，欢迎选购', path: '/pages/index/index' }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return { title: config.APP_NAME + ' - 精选好物，欢迎选购' }
  },

  async loadHome() {
    try {
      const data = await api.getHomeData()
      this.setData({ banners: data.banners })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  // 搜索栏提交 -> 商品池(按名称搜索)
  onSearch(e) {
    const kw = (e.detail.keyword || '').trim()
    if (!kw) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/products/products?keyword=' + encodeURIComponent(kw) })
  },

  // 专区卡片 -> 商品池
  onZoneTap(e) {
    const zone = e.currentTarget.dataset.zone
    wx.navigateTo({ url: '/pages/products/products?zone=' + zone })
  },

  // 商家管理入口(隐藏入口: 首页底部)
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  // 新客联系商家: 弹出微信号
  showContact() {
    if (!this.data.contactWechat) {
      wx.showToast({ title: '商家微信号暂未配置', icon: 'none' })
      return
    }
    this.setData({ showContactPopup: true })
  },

  closeContact() {
    this.setData({ showContactPopup: false })
  },

  // 阻止弹窗内容点击冒泡到遮罩(关闭)
  noop() {},

  // 复制微信号
  copyWechat() {
    wx.setClipboardData({
      data: this.data.contactWechat,
      success: () => {
        wx.showToast({ title: '已复制，去微信添加吧', icon: 'none' })
        this.setData({ showContactPopup: false })
      }
    })
  }
})
