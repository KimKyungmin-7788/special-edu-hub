import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

// 실제 업로드 함수와 설치된 SDK를 실행하되 네트워크 경계만 대체한다.
const source = ts.transpileModule(readFileSync(new URL('../src/lib/apps.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

for (const browserType of ['', 'application/octet-stream', 'font/ttf']) {
  test(`TTF 전송 형식: 브라우저 type=${browserType || '(빈 값)'}`, async () => {
    let sentType
    const client = createClient('https://example.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (url, options) => {
        const request = new Request(url, options)
        const form = await request.formData()
        sentType = form.get('').type
        return sentType === 'font/ttf'
          ? new Response(JSON.stringify({ Key: 'app-files/test.ttf' }), { status: 200 })
          : new Response(JSON.stringify({ message: `mime type ${sentType} is not supported`, statusCode: '415', error: 'InvalidMimeType' }), { status: 415 })
      } },
    })
    const exports = {}
    runInNewContext(source, {
      exports, Blob, File, crypto,
      require: (name) => {
        if (name === '@/lib/supabase') return { supabase: {
          storage: client.storage,
          auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }) },
        } }
        if (name === '@/config/categories') return {}
        throw new Error(name)
      },
    })
    const file = new File(['font fixture'], '글꼴.TTF', { type: browserType })
    const saved = await exports.uploadAppFile(file)
    assert.equal(sentType, 'font/ttf')
    assert.equal(saved.name, file.name)
    assert.equal(saved.size, file.size)
  })
}
