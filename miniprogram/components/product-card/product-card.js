// 商品卡片组件(双列网格复用)
Component({
  properties: {
    product: { type: Object, value: {} }
  },
  methods: {
    goDetail() {
      const id = this.properties.product.id
      if (id) {
        wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
      }
    }
  }
})
