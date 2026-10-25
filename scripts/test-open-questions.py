"""Browser regression checks. Requires Playwright and a local Chrome installation.

Usage: python scripts/test-open-questions.py [--channel chrome|msedge]
"""
import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
KEY = 'quiz-tepla-1er-parcial-v1'
DATA = json.loads((ROOT / 'subjects/tepla/1er-parcial/questions.json').read_text(encoding='utf-8'))
OPEN = [q for q in DATA['questions'] if q['type'] == 'info']
CLOSED = [q for q in DATA['questions'] if q['type'] != 'info']


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run(channel):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel=channel, headless=True)
            context = browser.new_context(reduced_motion='reduce')
            # Fonts are cosmetic; these checks run without external network requests.
            context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
            context.route('https://fonts.gstatic.com/**', lambda route: route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/subjects/tepla/1er-parcial/')
            expect(page.locator('#practiceMode')).to_be_visible()

            # Old stored progress has neither practice nor writtenAnswers.
            old = dict(answers={CLOSED[0]['id']: dict(ans=CLOSED[0]['correct'], score=1)},
                       topics=list(DATA['topics']), section='Modelo 2025', status='wrong')
            page.evaluate('([key, state]) => localStorage.setItem(key, JSON.stringify(state))', [KEY, old])
            page.reload()
            page.get_by_role('button', name='Preguntas Abiertas', exact=True).click()
            expect(page.locator('#grid .dot')).to_have_count(len(OPEN))
            expect(page.locator('#sectionFilter')).to_have_value('all')
            expect(page.locator('#statusFilter')).to_have_value('all')
            expect(page.locator('#stats')).not_to_contain_text('Puntaje')

            field = page.locator('#main textarea')
            draft = 'Mi desarrollo: <img src=x onerror=alert(1)>\nComparo entrada y salida.'
            field.fill(draft)
            field.press('End')
            field.press('Enter')
            field.press('1')
            draft = field.input_value()
            expect(page.locator('#main .review')).to_have_count(0)
            page.reload()
            expect(field).to_have_value(draft)
            page.locator('#next').click()
            expect(field).to_have_value('')
            page.locator('#prev').click()
            expect(field).to_have_value(draft)

            page.get_by_role('button', name='Ver respuesta', exact=True).click()
            expect(field).to_have_attribute('readonly', '')
            expect(page.get_by_role('heading', name='Respuesta orientativa')).to_be_visible()
            expect(page.locator('#main .source-page img').first).to_be_visible()
            saved = page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)
            assert saved['answers'][OPEN[0]['id']] == {'seen': True}
            assert saved['answers'][CLOSED[0]['id']]['score'] == 1
            assert saved['writtenAnswers'][OPEN[0]['id']] == draft
            page.reload()
            expect(field).to_have_value(draft)
            expect(page.get_by_role('heading', name='Respuesta orientativa')).to_be_visible()
            page.get_by_role('button', name='Ocultar respuesta', exact=True).click()
            expect(field).to_be_editable()
            expect(field).to_have_value(draft)
            expect(page.locator('#main textarea img')).to_have_count(0)

            page.get_by_role('button', name='Todas en una página', exact=True).click()
            expect(page.locator('#main textarea')).to_have_count(len(OPEN))
            page.locator('#main textarea').nth(1).fill('Segundo desarrollo')
            page.locator('#sectionFilter').select_option('Resumen 2024')
            expect(page.locator('#main textarea')).to_have_count(3)
            page.locator('#sectionFilter').select_option('Modelo 2025')
            expect(page.locator('#main textarea')).to_have_count(10)
            page.locator('#sectionFilter').select_option('all')
            page.locator('#noTopics').click()
            expect(page.locator('#main textarea')).to_have_count(0)
            page.locator('#allTopics').click()
            expect(page.locator('#main textarea')).to_have_count(len(OPEN))

            page.get_by_role('button', name='Cuestionario', exact=True).click()
            expect(page.locator('#main textarea')).to_have_count(0)
            expect(page.locator('#main article')).to_have_count(len(CLOSED))
            expect(page.locator('#stats')).to_contain_text('Puntaje 1,00')
            page.get_by_role('button', name='Todas las preguntas', exact=True).click()
            expect(page.locator('#main article')).to_have_count(len(DATA['questions']))
            expect(page.locator('#main textarea').nth(1)).to_have_value('Segundo desarrollo')
            page.get_by_role('button', name='Preguntas Abiertas', exact=True).click()
            page.get_by_role('button', name='Una por vez', exact=True).click()

            # Narrow mobile layout, light and dark, with and without revealed sources.
            page.set_viewport_size({'width': 360, 'height': 800})
            for theme in ['light', 'dark']:
                page.evaluate('(theme) => document.documentElement.dataset.theme = theme', theme)
                expect(page.get_by_role('button', name='Preguntas Abiertas', exact=True)).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#main .check').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#reset').click()
            expect(page.locator('#main textarea')).to_have_value('')
            saved = page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)
            assert saved['answers'] == {} and saved['writtenAnswers'] == {}
            page.reload()
            expect(page.locator('#main textarea')).to_have_value('')

            # Existing info cards in other subjects retain their reveal-only behavior.
            page.goto(base + '/subjects/asi/1er-parcial/')
            expect(page.locator('#main article')).to_have_count(1)
            expect(page.locator('#practiceMode')).to_have_count(0)
            page.get_by_role('button', name='Todas en una página', exact=True).click()
            expect(page.locator('#main textarea')).to_have_count(0)
            page.get_by_role('button', name='Ver respuesta', exact=True).first.click()
            expect(page.get_by_role('heading', name='Respuesta', exact=True).first).to_be_visible()
            assert not errors, errors
            browser.close()
            print(f'OK: {len(OPEN)} abiertas; filtros, guardado, progreso previo, puntaje, móvil y ASI.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--channel', default='chrome')
    run(parser.parse_args().channel)
