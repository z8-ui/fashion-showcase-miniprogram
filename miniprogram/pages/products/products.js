// 专区页: 进专区先显示组别小卡片 -> 点组别看该组商品列表(图/视频混排)
// 组别下若有小分组(如 青少年组 -> 牛仔裤/休闲裤/工装裤), 显示小分组 chips 筛选
// 也支持关键词搜索模式(直接列表)
const api = require('../../services/api')
const config = require('../../utils/config')

Page({
  data: {
    zoneKey: '',
    zoneName: '',
    isSearch: false,
    keyword: '',
    groupCards: [],   // 组别小卡片: [{name, icon}]
    groups: [],       // 组别字符串(chips 切换用)
    activeGroup: '',
    subGroups: [],    // 当前组别下的小分组(空数组 = 无小分组)
    activeSubGroup: '',  // '' = 全部
    products: [],
    // 分页
    page: 0,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    const zone = config.ZONES.find(z => z.key === options.zone)
    const keyword = options.keyword ? decodeURIComponent(options.keyword) : ''
    const isSearch = !zone && !!keyword
    const groups = zone ? zone.groups : []
    this.setData({
      zoneKey: zone ? zone.key : '',
      zoneName: zone ? zone.name : (keyword ? '搜索: ' + keyword : '全部商品'),
      isSearch,
      keyword,
      groups,
      groupCards: groups.map(g => ({ name: g }))
    })
    wx.setNavigationBarTitle({ title: this.data.zoneName })
    if (isSearch) this.loadProducts('', '', true)
  },

  // 转发给好友/群(还原当前专区或搜索状态)
  onShareAppMessage() {
    const d = this.data
    let path = '/pages/products/products'
    if (d.zoneKey) {
      path += '?zone=' + d.zoneKey
    } else if (d.keyword) {
      path += '?keyword=' + encodeURIComponent(d.keyword)
    }
    return {
      title: d.zoneName || '珠珠童装 - 商品精选',
      path
    }
  },

  // 点组别卡片 / 切换组别 chips
  onGroupTap(e) {
    const group = e.currentTarget.dataset.group
    if (group === this.data.activeGroup) return
    // 切换组别: 重置小分组为"全部" + 重置分页
    this.setData({
      activeGroup: group,
      activeSubGroup: '',
      subGroups: this.subGroupsOf(group),
      page: 0,
      hasMore: true
    })
    this.loadProducts(group, '', true)
  },

  // 点小分组 chips(仅组别下有小分组时出现)
  onSubGroupTap(e) {
    const sub = e.currentTarget.dataset.subgroup
    if (sub === this.data.activeSubGroup) return
    this.setData({ activeSubGroup: sub, page: 0, hasMore: true })
    this.loadProducts(this.data.activeGroup, sub, true)
  },

  // 取某组别下的小分组列表(配置在 config.ZONES[].subGroups)
  subGroupsOf(group) {
    const zone = config.ZONES.find(z => z.key === this.data.zoneKey)
    if (!zone || !zone.subGroups || !group) return []
    return zone.subGroups[group] || []
  },

  // 加载商品列表
  //   reset=true  -> 重新加载第 0 页(切换组别/小分组/搜索)
  //   reset=false -> 加载下一页(触底)
  async loadProducts(group, subGroup, reset) {
    if (this.data.loading) return
    const zone = config.ZONES.find(z => z.key === this.data.zoneKey)
    const filter = {
      gender: zone ? zone.gender : '',
      part: zone ? zone.part : '',
      group,
      subGroup: subGroup || '',
      keyword: this.data.keyword
    }
    const page = reset ? 0 : this.data.page
    this.setData({ loading: true })
    try {
      const { list } = await api.getProducts(filter, page, this.data.pageSize)
      const products = reset ? list : this.data.products.concat(list)
      this.setData({
        products,
        page: page + 1,
        hasMore: list.length === this.data.pageSize,  // 不足一页 = 没有更多
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  // 触底加载下一页(小程序页面生命周期)
  onReachBottom() {
    if (this.data.isSearch || this.data.activeGroup) {
      if (this.data.hasMore && !this.data.loading) {
        this.loadProducts(this.data.activeGroup, this.data.activeSubGroup, false)
      }
    }
  }
})
