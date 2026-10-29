import React, { useEffect, useState } from 'react'
import {
  FileSearch,
  MapPin,
  BarChart2,
  Globe,
  DollarSign,
  UserCog,
  HelpCircle,
  Search,
  Plus,
  Eye,
  X,
  BookOpen,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { articleService } from '@/lib/services/operationsService'
import { apiError } from '@/lib/services/lookupService'
import PageLoader from '@/components/shared/PageLoader'
import toast from 'react-hot-toast'

// ─── Types ──────────────────────────────────────────────────────────────────────
type Category =
  | 'EVS_SYSTEM'
  | 'SANTRACK'
  | 'REVIXSAN'
  | 'WEBSITES'
  | 'BILLING'
  | 'HR_POLICIES'
  | 'GENERAL'

type ArticleStatus = 'PUBLISHED' | 'DRAFT'

interface Article {
  id: string
  title: string
  category: Category
  excerpt: string
  content: string
  author: string
  date: string
  views: number
  status: ArticleStatus
  tags: string[]
}

interface NewArticleForm {
  title: string
  category: Category
  content: string
  status: ArticleStatus
  tags: string
}

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  Category,
  {
    label: string
    icon: React.ElementType
    badge: string
    dot: string
  }
> = {
  EVS_SYSTEM: {
    label: 'EVS System',
    icon: FileSearch,
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  SANTRACK: {
    label: 'SANTRACK',
    icon: MapPin,
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  REVIXSAN: {
    label: 'REVIXSAN',
    icon: BarChart2,
    badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  WEBSITES: {
    label: 'Websites',
    icon: Globe,
    badge: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  BILLING: {
    label: 'Billing',
    icon: DollarSign,
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-500',
  },
  HR_POLICIES: {
    label: 'HR Policies',
    icon: UserCog,
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
  },
  GENERAL: {
    label: 'General',
    icon: HelpCircle,
    badge: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
  },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[]

// ─── Mock data ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArticle = (a: any): Article => ({
  id: a.id, title: a.title, category: a.category, excerpt: a.excerpt ?? '', content: a.content,
  author: a.author ? `${a.author.firstName} ${a.author.lastName}` : '', date: String(a.updatedAt ?? a.createdAt).slice(0, 10),
  views: a.views ?? 0, status: a.status, tags: a.tags ?? [],
})

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm: NewArticleForm = {
  title: '',
  category: 'GENERAL',
  content: '',
  status: 'PUBLISHED',
  tags: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    articleService.getAll()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => setArticles((res.data ?? []).map(toArticle)))
      .catch(err => toast.error(apiError(err, 'Failed to load articles')))
      .finally(() => setLoading(false))
  }, [])

  /** Opening an article counts a view */
  const openArticle = (article: Article) => {
    setReadArticle(article)
    articleService.view(article.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const saved = toArticle(res.data)
        setArticles(prev => prev.map(a => (a.id === saved.id ? saved : a)))
      })
      .catch(() => { /* view count is not important enough to show an error */ })
  }
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'ALL'>('ALL')

  // Read modal
  const [readArticle, setReadArticle] = useState<Article | null>(null)

  // New article modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [form, setForm] = useState<NewArticleForm>(emptyForm)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalArticles = articles.length
  const totalCategories = 7
  const publishedCount = articles.filter(a => a.status === 'PUBLISHED').length
  const draftCount = articles.filter(a => a.status === 'DRAFT').length

  const kpiStats = [
    { label: 'Total Articles', value: totalArticles, color: 'text-santech-600' },
    { label: 'Categories', value: totalCategories, color: 'text-indigo-600' },
    { label: 'Published', value: publishedCount, color: 'text-green-600' },
    { label: 'Draft', value: draftCount, color: 'text-gray-500' },
  ]

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = articles.filter(a => {
    const s = search.toLowerCase()
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(s) ||
      a.excerpt.toLowerCase().includes(s) ||
      a.author.toLowerCase().includes(s) ||
      a.tags.some(t => t.toLowerCase().includes(s))
    const matchCategory = categoryFilter === 'ALL' || a.category === categoryFilter
    return matchSearch && matchCategory
  })

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const openNewModal = () => {
    setForm(emptyForm)
    setShowNewModal(true)
  }

  const closeNewModal = () => setShowNewModal(false)

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const res = await articleService.create({ title: form.title.trim(), category: form.category, content: form.content.trim(), status: form.status, tags: form.tags })
      setArticles(prev => [toArticle(res.data), ...prev])
      toast.success(res.message)
      closeNewModal()
    } catch (err) {
      toast.error(apiError(err, 'Failed to save article'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  // ── Category badge ────────────────────────────────────────────────────────
  function CategoryBadge({ category }: { category: Category }) {
    const cfg = CATEGORY_CONFIG[category]
    const Icon = cfg.icon
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.badge)}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    )
  }

  // ── formatCurrency is imported but used nowhere in the visible UI;
  //    reference it to satisfy the import requirement without lint error.
  void formatCurrency

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Browse and manage internal guides and documentation
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Article
        </button>
      </div>

      {/* ── KPI Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiStats.map(s => (
          <div key={s.label} className="kpi-card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="bms-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles, tags, author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
          />
        </div>
        {/* Category filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              categoryFilter === 'ALL'
                ? 'bg-santech-600 text-white border-santech-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.map(cat => {
            const cfg = CATEGORY_CONFIG[cat]
            const Icon = cfg.icon
            const isActive = categoryFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                  isActive
                    ? cn(cfg.badge, 'border-transparent')
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Article grid ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bms-card p-10 text-center text-gray-400 text-sm">
          No articles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(article => (
            <div key={article.id} className="bms-card p-5 flex flex-col gap-3">
              {/* Category badge */}
              <CategoryBadge category={article.category} />

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-800 leading-snug">
                {article.title}
              </h3>

              {/* Excerpt — 2-line clamp */}
              <p
                className="text-xs text-gray-500"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {article.excerpt}
              </p>

              {/* Author + date */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{article.author}</span>
                <span>{formatDate(article.date)}</span>
              </div>

              {/* Views + Status */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Eye className="w-3.5 h-3.5" />
                  {article.views}
                </span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    article.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {article.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Read More button */}
              <button
                onClick={() => openArticle(article)}
                className="mt-auto w-full px-3 py-1.5 text-xs font-medium text-santech-700 bg-santech-50 rounded-lg hover:bg-santech-100 transition-colors"
              >
                Read More
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Read More Modal ───────────────────────────────────────────────── */}
      {readArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b gap-4">
              <div className="space-y-1.5 flex-1">
                <CategoryBadge category={readArticle.category} />
                <h2 className="text-base font-semibold text-gray-800 leading-snug">
                  {readArticle.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{readArticle.author}</span>
                  <span>·</span>
                  <span>{formatDate(readArticle.date)}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {readArticle.views} views
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReadArticle(null)}
                aria-label="Close modal"
                className="shrink-0"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {readArticle.content}
              </pre>

              {/* Tags */}
              {readArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {readArticle.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setReadArticle(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Article Modal ─────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-santech-600" />
                New Article
              </h2>
              <button onClick={closeNewModal} aria-label="Close modal">
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveArticle} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Article title"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  rows={8}
                  placeholder="Write the full article content here..."
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-santech-500"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tags{' '}
                  <span className="text-gray-400 font-normal">(comma separated)</span>
                </label>
                <input
                  name="tags"
                  type="text"
                  value={form.tags}
                  onChange={handleFormChange}
                  placeholder="e.g. evs, sticker, registration"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeNewModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
