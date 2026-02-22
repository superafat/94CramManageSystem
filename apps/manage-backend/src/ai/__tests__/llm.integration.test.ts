import { describe, it, expect } from 'vitest'
import { classifyIntent } from '../router'

describe('classifyIntent edge cases', () => {
  it('handles mixed intent signals - complaint wins', () => {
    expect(classifyIntent('報名後態度很差我要投訴')).toBe('complaint')
  })
  it('handles English keywords', () => {
    expect(classifyIntent('hello')).toBe('general')
  })
  it('handles empty-ish queries', () => {
    expect(classifyIntent('嗨')).toBe('general')
  })
  it('handles long query with billing keywords', () => {
    expect(classifyIntent('我想問一下學費的問題，國中部一個月要繳多少錢？可以刷卡嗎？')).toBe('billing')
  })
  it('handles homework intent', () => {
    expect(classifyIntent('我兒子這次數學考卷的分數怎麼這麼低')).toBe('homework')
  })
  it('handles attendance with leave', () => {
    expect(classifyIntent('小朋友今天感冒想請假')).toBe('attendance')
  })
  it('detects report intent', () => {
    expect(classifyIntent('可以幫我匯出這個月的出席統計嗎')).toBe('report')
  })
})
