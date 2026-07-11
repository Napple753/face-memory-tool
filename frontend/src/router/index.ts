import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'upload', component: () => import('../views/UploadView.vue') },
  { path: '/mapping', name: 'mapping', component: () => import('../views/ColumnMappingView.vue') },
  { path: '/annotate', name: 'annotate', component: () => import('../views/AnnotateView.vue') },
  { path: '/missing', name: 'missing', component: () => import('../views/MissingMembersView.vue') },
  { path: '/export', name: 'export', component: () => import('../views/ExportView.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
