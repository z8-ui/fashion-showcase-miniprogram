// 商家管理页
//  cloud 模式: openid 白名单验证(admins 集合) + 云存储上传, 全用户共享
//  local 模式: 密码锁 + 本机持久目录(测试用)
const api = require('../../services/api')
const config = require('../../utils/config')

// 管理密码本地存储 key(仅 local 模式使用)
const PWD_KEY = 'zhuzhu_admin_pwd'

// 媒体持久化目录(仅 local 模式使用)
const MEDIA_DIR = wx.env.USER_DATA_PATH + '/zhuzhu_media'

Page({
  data: {
    // ---- 登录态 ----
    locked: false,   // local 模式: 密码锁
    denied: false,   // cloud 模式: 白名单校验未通过
    pwdMode: 'login',
    pwd: '',
    pwd2: '',
    isCloud: config.DATA_SOURCE === 'cloud',

    // ---- 上传表单 ----
    zones: config.ZONES,
    zone: '',
    groups: [],
    group: '',
    subGroups: [],    // 当前组别下的小分组(空 = 该组别无小分组)
    subGroup: '',
    name: '',
    mediaItems: [],    // [{type:'image'|'video', url, poster?}]
    products: [],
    searchKeyword: '',
    // ---- 重复商品提示(输入名称时实时检测) ----
    dupHints: [],      // 检测到的重复商品 [{name, zoneName, groupLabel, same}]
    dupTotal: 0,       // 重复商品总数(提示区最多显示前3条)
    // ---- 批量选择删除(长按商品进入) ----
    batchMode: false,     // 批量选择模式
    selectedIds: [],      // 已选中的商品 id
    allSelected: false,   // 当前列表是否全选

    // ---- 批量修改标签面板 ----
    tagPanel: false,      // 标签面板是否打开
    tagZone: '',          // 目标专区 key
    tagGroups: [],        // 目标专区下的组别
    tagGroup: '',         // 目标组别
    tagSubGroups: [],     // 目标组别下的小分组
    tagSubGroup: ''       // 目标小分组('' = 不设置)
  },

  onLoad() {
    if (this.data.isCloud) {
      // 云开发: openid 白名单校验
      wx.showLoading({ title: '验证身份...', mask: true })
      api.checkAdmin().then(ok => {
        wx.hideLoading()
        if (!ok) {
          this.setData({ denied: true })
          wx.showToast({ title: '无权限：仅商家微信可进入', icon: 'none' })
        } else {
          this.refreshList()
        }
      }).catch(() => {
        wx.hideLoading()
        this.setData({ denied: true })
        wx.showToast({ title: '验证失败', icon: 'none' })
      })
    } else {
      // 本地模式: 密码锁
      const hasPwd = wx.getStorageSync(PWD_KEY)
      this.setData({ locked: true, pwdMode: hasPwd ? 'login' : 'setup' })
      if (!hasPwd) {
        wx.showToast({ title: '首次使用，请先设置管理密码', icon: 'none' })
      }
      this.refreshList()
    }
  },

  // ================= 本地模式密码锁 =================
  onPwdInput(e) { this.setData({ pwd: e.detail.value }) },
  onPwd2Input(e) { this.setData({ pwd2: e.detail.value }) },
  onPwdConfirm() {
    const pwd = this.data.pwd
    if (this.data.pwdMode === 'setup') {
      if (pwd.length < 4) {
        wx.showToast({ title: '密码至少4位', icon: 'none' })
        return
      }
      if (pwd !== this.data.pwd2) {
        wx.showToast({ title: '两次输入不一致', icon: 'none' })
        return
      }
      wx.setStorageSync(PWD_KEY, pwd)
      wx.showToast({ title: '密码已设置', icon: 'success' })
      this.unlock()
    } else {
      if (pwd === wx.getStorageSync(PWD_KEY)) {
        this.unlock()
      } else {
        wx.showToast({ title: '密码错误', icon: 'none' })
        this.setData({ pwd: '' })
      }
    }
  },
  unlock() { this.setData({ locked: false, pwd: '', pwd2: '' }) },
  onChangePwd() {
    wx.showModal({
      title: '修改管理密码',
      content: '将重新设置管理密码，原密码立即失效。',
      confirmText: '去设置',
      success: r => {
        if (r.confirm) {
          this.setData({ locked: true, pwdMode: 'setup', pwd: '', pwd2: '' })
        }
      }
    })
  },
  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) })
  },

  // ================= 上传表单 =================
  onZonePick(e) {
    const zone = e.currentTarget.dataset.key
    const z = config.ZONES.find(x => x.key === zone)
    this.setData({
      zone,
      groups: z ? z.groups : [],
      group: '',
      subGroups: [],
      subGroup: ''
    })
  },

  onGroupPick(e) {
    const group = e.currentTarget.dataset.group
    // 选中组别后, 同步该组别的小分组配置
    const z = config.ZONES.find(x => x.key === this.data.zone)
    const subGroups = (z && z.subGroups && z.subGroups[group]) || []
    this.setData({ group, subGroups, subGroup: '' })
  },

  onSubGroupPick(e) {
    this.setData({ subGroup: e.currentTarget.dataset.subgroup })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
    this.checkDuplicate(e.detail.value)
  },

  // ================= 重复商品检测 =================
  // 输入名称时实时检测: 与已上传商品比对
  // 判定规则:
  //   同名   -> 名称完全相同(去除首尾空格, 忽略大小写)  高置信
  //   相近   -> 名称互相包含 或 差异很小(编辑距离<=1)    中置信
  // 检测范围: 全量商品(不限当前专区/组别, 商家自行判断是否误报)
  checkDuplicate(name) {
    const kw = String(name || '').trim().toLowerCase()
    const all = this._allProducts || []
    const zoneMap = {}
    config.ZONES.forEach(z => { zoneMap[z.gender + '-' + z.part] = z.name })

    const hints = []
    if (kw) {
      all.forEach(p => {
        const pn = String(p.name || '').trim().toLowerCase()
        if (!pn) return
        const same = pn === kw
        const similar = !same && (
          pn.indexOf(kw) !== -1 || kw.indexOf(pn) !== -1 || this.levenshtein(pn, kw) <= 1
        )
        if (same || similar) {
          hints.push({
            name: p.name,
            zoneName: zoneMap[p.gender + '-' + p.part] || '',
            groupLabel: p.subGroup ? (p.group + ' · ' + p.subGroup) : p.group,
            same
          })
        }
      })
    }
    this.setData({ dupHints: hints.slice(0, 3), dupTotal: hints.length })
  },

  // 编辑距离(Levenshtein), 用于检测"名称只差一个字"的近似重复
  levenshtein(a, b) {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp = []
    for (let i = 0; i <= m; i++) dp[i] = [i]
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      }
    }
    return dp[m][n]
  },

  // 拍照/相册选图或视频(最多3个)
  // 清晰度: 用 compressed 压缩图(约100-400KB/张)控制云存储容量与流量费用;
  //         2000张原图约10GB(超套餐2GB后按3元/GB/月计), 压缩图仅0.5GB。
  //         若甲方要求看清图片上的价格/款号小字, 可改回 ['original']
  onChooseMedia() {
    const remain = 3 - this.data.mediaItems.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      maxDuration: 60,
      success: res => {
        const items = res.tempFiles.map(f => ({
          type: f.fileType === 'video' ? 'video' : 'image',
          url: f.tempFilePath,
          poster: f.thumbTempFilePath || ''
        }))
        this.setData({ mediaItems: this.data.mediaItems.concat(items) })
      }
    })
  },

  onRemoveMedia(e) {
    const idx = e.currentTarget.dataset.index
    const arr = this.data.mediaItems.slice()
    arr.splice(idx, 1)
    this.setData({ mediaItems: arr })
  },

  async onSave() {
    const { zone, group, subGroup, name, mediaItems } = this.data
    if (!zone) { wx.showToast({ title: '请选择专区', icon: 'none' }); return }
    if (!group) { wx.showToast({ title: '请选择组别', icon: 'none' }); return }
    // 该组别配置了小分组时, 必须选一个小分组
    if (this.data.subGroups.length && !subGroup) {
      wx.showToast({ title: '请选择小分组', icon: 'none' }); return
    }
    if (!name.trim()) { wx.showToast({ title: '请填写商品名称', icon: 'none' }); return }
    if (!mediaItems.length) { wx.showToast({ title: '请上传商品图或视频', icon: 'none' }); return }

    // 重复商品提示: 存在同名/相近商品时, 让商家确认是否继续
    // (商家可能故意上传同名不同款/不同颜色, 因此不强制拦截, 仅提示)
    if (this.data.dupTotal > 0) {
      const first = this.data.dupHints[0]
      const detail = first
        ? '如「' + first.name + '」' + (first.zoneName ? '（' + first.zoneName + ' · ' + first.groupLabel + '）' : '')
        : ''
      const extra = this.data.dupTotal > 1 ? '，另有 ' + (this.data.dupTotal - 1) + ' 个相近商品' : ''
      wx.showModal({
        title: '⚠️ 可能重复上传',
        content: '检测到 ' + this.data.dupTotal + ' 个同名/相近商品' + detail + extra + '。\n确认仍要保存吗？',
        confirmText: '仍要保存',
        cancelText: '再想想',
        success: r => { if (r.confirm) this.doSave() }
      })
      return
    }
    this.doSave()
  },

  async doSave() {
    const { zone, group, subGroup, name, mediaItems } = this.data
    wx.showLoading({ title: '上传中...', mask: true })
    try {
      const z = config.ZONES.find(x => x.key === zone)
      // 先把图片/视频传到云端或本地, 拿到可访问路径
      const media = this.data.isCloud
        ? await this.uploadToCloud(mediaItems)
        : this.persistMedia(mediaItems)
      await api.addProduct({
        name: name.trim(),
        gender: z.gender,
        part: z.part,
        group,
        subGroup: subGroup || '',
        media
      })
      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
      this.setData({
        zone: '', groups: [], group: '',
        subGroups: [], subGroup: '',
        name: '', mediaItems: [],
        dupHints: [], dupTotal: 0
      })
      this.refreshList()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '保存失败', icon: 'none' })
    }
  },

  // ================= 已上传列表 =================
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.refreshList()
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' })
    this.refreshList()
  },

  refreshList() {
    const kw = (this.data.searchKeyword || '').trim().toLowerCase()
    const zoneMap = {}
    config.ZONES.forEach(z => { zoneMap[z.gender + '-' + z.part] = z.name })

    let list = api.getLocalProducts()
    if (!Array.isArray(list)) {
      // cloud 模式返回 Promise
      list.then(arr => {
        // 缓存全量列表(供重复检测使用)
        this._allProducts = arr
        this.renderList(arr, kw, zoneMap)
      }).catch(e => {
        wx.showToast({ title: e.message || '加载失败', icon: 'none' })
      })
      return
    }
    // local 模式: 直接缓存全量列表
    this._allProducts = list
    this.renderList(list, kw, zoneMap)
  },

  renderList(list, kw, zoneMap) {
    if (kw) {
      list = list.filter(p => p.name.toLowerCase().indexOf(kw) !== -1)
    }
    list = list.map(p => {
      return Object.assign({}, p, {
        zoneName: zoneMap[p.gender + '-' + p.part] || '',
        groupLabel: p.subGroup ? (p.group + ' · ' + p.subGroup) : p.group,
        typeBadge: (p.media || []).some(m => m.type === 'video') ? '含视频' : '图片'
      })
    })
    // 同步批量选中状态(剔除已不存在/被过滤的商品, 并标记 selected)
    this.syncBatchState(list)
  },

  // 同步批量选择状态: 计算每个商品的 selected 标记 + 全选状态
  syncBatchState(products, selectedIds) {
    const sel = (selectedIds || this.data.selectedIds)
      .filter(id => products.some(p => p.id === id))
    const selectedMap = {}
    sel.forEach(id => { selectedMap[id] = true })
    const decorated = products.map(p => Object.assign({}, p, { selected: !!selectedMap[p.id] }))
    this.setData({
      products: decorated,
      selectedIds: sel,
      allSelected: products.length > 0 && sel.length === products.length
    })
  },

  // ================= 批量选择删除(长按商品进入) =================

  // 长按单个商品 -> 进入批量模式并预选该商品
  onLongPressProduct(e) {
    if (this.data.batchMode) return
    const id = e.currentTarget.dataset.id
    this.syncBatchState(this.data.products, [id])
    this.setData({ batchMode: true })
  },

  // 批量模式: 点按商品行切换选中
  onToggleSelect(e) {
    if (!this.data.batchMode) return
    const id = e.currentTarget.dataset.id
    const sel = this.data.selectedIds.slice()
    const i = sel.indexOf(id)
    if (i === -1) sel.push(id)
    else sel.splice(i, 1)
    this.syncBatchState(this.data.products, sel)
  },

  // 全选 / 取消全选
  onSelectAll() {
    const all = this.data.products.map(p => p.id)
    this.syncBatchState(this.data.products, this.data.allSelected ? [] : all)
  },

  // 退出批量模式
  onExitBatch() {
    const products = this.data.products.map(p => {
      const c = Object.assign({}, p)
      delete c.selected
      return c
    })
    this.setData({ batchMode: false, products, selectedIds: [], allSelected: false })
  },

  // ================= 批量修改标签(改归类/补小分组) =================

  // 打开标签面板(仅批量模式下可点)
  onOpenTagPanel() {
    const sel = this.data.selectedIds
    if (!sel.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    this.setData({
      tagPanel: true,
      tagZone: '', tagGroups: [], tagGroup: '',
      tagSubGroups: [], tagSubGroup: ''
    })
  },

  onTagZonePick(e) {
    const zone = e.currentTarget.dataset.key
    const z = config.ZONES.find(x => x.key === zone)
    this.setData({
      tagZone: zone,
      tagGroups: z ? z.groups : [],
      tagGroup: '',
      tagSubGroups: [],
      tagSubGroup: ''
    })
  },

  onTagGroupPick(e) {
    const group = e.currentTarget.dataset.group
    const z = config.ZONES.find(x => x.key === this.data.tagZone)
    const subGroups = (z && z.subGroups && z.subGroups[group]) || []
    this.setData({ tagGroup: group, tagSubGroups: subGroups, tagSubGroup: '' })
  },

  onTagSubGroupPick(e) {
    this.setData({ tagSubGroup: e.currentTarget.dataset.subgroup })
  },

  onTagCancel() {
    this.setData({ tagPanel: false })
  },

  // 空方法: 阻止弹层内容点击冒泡到遮罩关闭
  noop() {},

  // 应用标签到选中的商品
  async onTagConfirm() {
    const { tagZone, tagGroup, tagSubGroup, selectedIds } = this.data
    if (!tagZone) { wx.showToast({ title: '请选择目标专区', icon: 'none' }); return }
    if (!tagGroup) { wx.showToast({ title: '请选择目标组别', icon: 'none' }); return }
    const z = config.ZONES.find(x => x.key === tagZone)
    const patch = {
      gender: z.gender,
      part: z.part,
      group: tagGroup,
      subGroup: tagSubGroup || ''
    }
    const target = z.name + ' · ' + tagGroup + (tagSubGroup ? ' · ' + tagSubGroup : '')
    wx.showModal({
      title: '批量修改标签',
      content: '将选中的 ' + selectedIds.length + ' 个商品归类到「' + target + '」，确定吗？',
      confirmText: '确定',
      success: async r => {
        if (!r.confirm) return
        wx.showLoading({ title: '修改中...', mask: true })
        try {
          await api.updateProducts(selectedIds, patch)
          wx.hideLoading()
          wx.showToast({ title: '标签已更新', icon: 'success' })
          this.setData({ tagPanel: false, batchMode: false, selectedIds: [], allSelected: false })
          this.refreshList()
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: e.message || '修改失败', icon: 'none' })
        }
      }
    })
  },

  // 批量删除
  onBatchDelete() {
    const sel = this.data.selectedIds
    if (!sel.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    const picked = this.data.products.filter(p => sel.indexOf(p.id) !== -1)
    const names = picked.map(p => p.name)
    const preview = names.slice(0, 2).join('、') + (names.length > 2 ? ' 等' : '')
    wx.showModal({
      title: '批量删除',
      content: '确定删除选中的 ' + sel.length + ' 个商品吗？' +
        (preview ? '（' + preview + '）' : '') + '\n删除后图片/视频将一并移除。',
      confirmText: '删除',
      confirmColor: '#E63946',
      success: async r => {
        if (!r.confirm) return
        wx.showLoading({ title: '删除中...', mask: true })
        try {
          await api.removeProduct(sel)
          // 清理关联媒体(云存储 / 本地持久目录)
          for (const p of picked) {
            if (this.data.isCloud) {
              await this.deleteCloudMedia(p.media)
            } else {
              this.deleteMedia(p.media)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: '已删除 ' + sel.length + ' 个商品', icon: 'none' })
          this.setData({ batchMode: false, selectedIds: [], allSelected: false })
          this.refreshList()
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const p = this.data.products.find(x => x.id === id)
    wx.showModal({
      title: '删除商品',
      content: '确定删除"' + (p ? p.name : '该商品') + '"吗？删除后图片/视频将一并移除。',
      success: async r => {
        if (!r.confirm) return
        try {
          await api.removeProduct(id)
          if (p) {
            if (this.data.isCloud) {
              await this.deleteCloudMedia(p.media)
            } else {
              this.deleteMedia(p.media)
            }
          }
          wx.showToast({ title: '已删除', icon: 'none' })
          this.refreshList()
        } catch (e) {
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  // ================= 云开发: 云存储上传/删除 =================
  async uploadToCloud(items) {
    const results = []
    for (let i = 0; i < items.length; i++) {
      const m = items[i]
      const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      if (m.type === 'video') {
        const up = await wx.cloud.uploadFile({
          cloudPath: 'products/vid_' + stamp + '_' + i + '.mp4',
          filePath: m.url
        })
        let poster = ''
        if (m.poster) {
          try {
            const upP = await wx.cloud.uploadFile({
              cloudPath: 'products/thumb_' + stamp + '_' + i + '.jpg',
              filePath: m.poster
            })
            poster = upP.fileID
          } catch (e) { /* 封面失败不阻塞 */ }
        }
        results.push({ type: 'video', url: up.fileID, poster })
      } else {
        const ext = (m.url.split('.').pop() || 'jpg').toLowerCase().slice(0, 4)
        const up = await wx.cloud.uploadFile({
          cloudPath: 'products/img_' + stamp + '_' + i + '.' + ext,
          filePath: m.url
        })
        results.push({ type: 'image', url: up.fileID })
      }
    }
    return results
  },

  async deleteCloudMedia(media) {
    const fileIDs = []
    ;(media || []).forEach(m => {
      if (m.url && m.url.indexOf('cloud://') === 0) fileIDs.push(m.url)
      if (m.poster && m.poster.indexOf('cloud://') === 0) fileIDs.push(m.poster)
    })
    if (fileIDs.length) {
      try { await wx.cloud.deleteFile({ fileList: fileIDs }) } catch (e) { /* 忽略 */ }
    }
  },

  // ================= 本地模式: 媒体持久化(临时路径 -> 应用持久目录) =================
  persistMedia(items) {
    const fs = wx.getFileSystemManager()
    try { fs.accessSync(MEDIA_DIR) } catch (e) { fs.mkdirSync(MEDIA_DIR, true) }
    const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    return items.map((m, i) => {
      if (m.type === 'video') {
        const vidDest = MEDIA_DIR + '/vid_' + stamp + '_' + i + '.mp4'
        fs.copyFileSync(m.url, vidDest)
        let poster = ''
        if (m.poster) {
          const thumbDest = MEDIA_DIR + '/thumb_' + stamp + '_' + i + '.jpg'
          try {
            fs.copyFileSync(m.poster, thumbDest)
            poster = thumbDest
          } catch (e) { /* 封面拷贝失败不阻塞 */ }
        }
        return { type: 'video', url: vidDest, poster }
      }
      const ext = (m.url.split('.').pop() || 'jpg').toLowerCase().slice(0, 4)
      const imgDest = MEDIA_DIR + '/img_' + stamp + '_' + i + '.' + ext
      fs.copyFileSync(m.url, imgDest)
      return { type: 'image', url: imgDest }
    })
  },

  deleteMedia(media) {
    const fs = wx.getFileSystemManager()
    ;(media || []).forEach(m => {
      const paths = [m.url, m.poster].filter(Boolean)
      paths.forEach(p => {
        if (p.indexOf(wx.env.USER_DATA_PATH) === 0) {
          try { fs.unlinkSync(p) } catch (e) { /* 忽略 */ }
        }
      })
    })
  }
})
