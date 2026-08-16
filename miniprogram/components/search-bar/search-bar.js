// 搜索栏组件(首页/分类页复用)
Component({
  properties: {
    placeholder: { type: String, value: '搜索商品名称' },
    value: { type: String, value: '' }
  },
  data: {
    keyword: ''
  },
  lifetimes: {
    attached() {
      this.setData({ keyword: this.properties.value })
    }
  },
  methods: {
    onInput(e) {
      this.setData({ keyword: e.detail.value })
      this.triggerEvent('input', { keyword: e.detail.value })
    },
    onSearch() {
      const kw = this.data.keyword.trim()
      this.triggerEvent('search', { keyword: kw })
    },
    onClear() {
      this.setData({ keyword: '' })
      this.triggerEvent('search', { keyword: '' })
    }
  }
})
