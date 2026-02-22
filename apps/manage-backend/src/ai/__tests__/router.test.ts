import { describe, it, expect } from 'vitest'
import { classifyIntent, getRoute } from '../router'

describe('classifyIntent', () => {
  it('detects complaint', () => {
    expect(classifyIntent('我要投訴老師態度不好')).toBe('complaint')
  })
  it('detects enrollment', () => {
    expect(classifyIntent('請問怎麼報名？')).toBe('enrollment')
  })
  it('detects billing', () => {
    expect(classifyIntent('學費多少錢')).toBe('billing')
  })
  it('detects schedule', () => {
    expect(classifyIntent('星期三有什麼課')).toBe('schedule')
  })
  it('detects attendance', () => {
    expect(classifyIntent('我兒子今天請假')).toBe('attendance')
  })
  it('detects homework', () => {
    expect(classifyIntent('這次考卷的成績怎樣')).toBe('homework')
  })
  it('detects faq', () => {
    expect(classifyIntent('請問補習班在哪裡')).toBe('faq')
  })
  it('defaults to general', () => {
    expect(classifyIntent('嗨')).toBe('general')
  })
})

describe('getRoute', () => {
  it('routes complaint to sonnet', () => {
    expect(getRoute('complaint').model).toBe('sonnet')
  })
  it('routes faq to flash-lite', () => {
    expect(getRoute('faq').model).toBe('flash-lite')
  })
  it('routes billing to flash', () => {
    expect(getRoute('billing').model).toBe('flash')
  })
})
