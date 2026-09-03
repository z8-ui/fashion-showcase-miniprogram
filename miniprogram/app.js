// 全局入口: 服装分类展示小程序(童装模板)
// 品牌/专区/文案均在 utils/config.js 配置, 页面不写死业务信息
// 流程 = 逛专区组别 -> 查看商品(图/视频) -> 保存商品图 -> 微信发给商家下单

const config = require('./utils/config')

App({
  globalData: {
    userInfo: null
  },

  onLaunch() {
    if (wx.cloud) {
      // 云开发初始化; CLOUD_ENV 留空 = 使用默认环境
      wx.cloud.init({
        env: config.CLOUD_ENV || undefined,
        traceUser: true
      })
      // 自建用户访问统计(平台自带统计个人版不展示/有延迟, 自己记录实时可控)
      // 数据落 users 集合: openid + firstVisit/lastVisit; 失败静默不影响业务
      wx.cloud.callFunction({ name: 'recordVisit', data: {} }).catch(() => {})
    }
    // 新版本就绪时提示用户重启生效(避免用户一直停留在旧缓存版本)
    if (wx.getUpdateManager) {
      const updateManager = wx.getUpdateManager()
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好,点击确定重启生效',
          showCancel: false,
          confirmText: '确定',
          success: () => updateManager.applyUpdate()
        })
      })
    }
  }
})
