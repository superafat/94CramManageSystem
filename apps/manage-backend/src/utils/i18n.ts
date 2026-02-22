type Locale = 'zh-TW' | 'zh-CN' | 'en'

interface Translations {
  [key: string]: {
    [locale in Locale]: string
  }
}

const translations: Translations = {
  'common.success': {
    'zh-TW': '成功',
    'zh-CN': '成功',
    'en': 'Success',
  },
  'common.error': {
    'zh-TW': '錯誤',
    'zh-CN': '错误',
    'en': 'Error',
  },
  'common.warning': {
    'zh-TW': '警告',
    'zh-CN': '警告',
    'en': 'Warning',
  },
  'common.info': {
    'zh-TW': '資訊',
    'zh-CN': '信息',
    'en': 'Info',
  },
  'common.loading': {
    'zh-TW': '載入中',
    'zh-CN': '加载中',
    'en': 'Loading',
  },
  'common.save': {
    'zh-TW': '儲存',
    'zh-CN': '保存',
    'en': 'Save',
  },
  'common.cancel': {
    'zh-TW': '取消',
    'zh-CN': '取消',
    'en': 'Cancel',
  },
  'common.delete': {
    'zh-TW': '刪除',
    'zh-CN': '删除',
    'en': 'Delete',
  },
  'common.edit': {
    'zh-TW': '編輯',
    'zh-CN': '编辑',
    'en': 'Edit',
  },
  'common.confirm': {
    'zh-TW': '確認',
    'zh-CN': '确认',
    'en': 'Confirm',
  },
}

let currentLocale: Locale = 'zh-TW'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: string, locale?: Locale): string {
  const targetLocale = locale || currentLocale
  const translation = translations[key]

  if (!translation) {
    return key
  }

  return translation[targetLocale] || key
}

export function addTranslation(key: string, values: { [locale in Locale]: string }): void {
  translations[key] = values
}

export function addTranslations(newTranslations: Translations): void {
  Object.assign(translations, newTranslations)
}

export { Locale, Translations }
