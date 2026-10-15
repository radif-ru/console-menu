/**
 * Тесты: вычисляющие функции, печать и сквозные сценарии из условия.
 * Запуск: npm test (встроенный node:test, без зависимостей).
 */

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const { describe, it, mock } = require('node:test')

const menu = require('../index.js')

const SCRIPT = path.join(__dirname, '..', 'index.js')
const MENU_TEXT = 'Выберите задачу:\n1 — билетная касса\n2 — доставка заказа\n3 — лестница\n'

/** Запускает программу, подав ответы через stdin, и возвращает stdout. */
function run(...answers) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    input: answers.map((answer) => `${answer}\n`).join(''),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

/** Собирает строки, напечатанные функцией через console.log. */
function captureLog(fn) {
  const log = mock.method(console, 'log', () => {})
  try {
    const value = fn()
    return { value, lines: log.mock.calls.map((call) => call.arguments.join(' ')) }
  } finally {
    log.mock.restore()
  }
}

describe('билетная касса', () => {
  it('ticketPrice возвращает цену по категории', () => {
    assert.deepEqual([1, 2, 3, 0, 4, NaN].map(menu.ticketPrice), [300, 500, 900, 0, 0, 0])
  })

  it('maxTickets считает билеты без деления', () => {
    assert.equal(menu.maxTickets(2300, 500), 4)
    assert.equal(menu.maxTickets(900, 900), 1)
    assert.equal(menu.maxTickets(299, 300), 0)
    assert.equal(menu.maxTickets(0, 300), 0)
    assert.equal(menu.maxTickets(1000, 0), 0)
  })

  it('printTicketResult печатает чек или неизвестную категорию', () => {
    assert.deepEqual(captureLog(() => menu.printTicketResult(2, 2300)).lines, [
      'Категория 2, билет 500 руб., бюджет 2300 руб.: можно купить 4 шт.',
    ])
    assert.deepEqual(captureLog(() => menu.printTicketResult(5, 2300)).lines, [
      'неизвестная категория',
    ])
  })
})

describe('доставка заказа', () => {
  it('deliveryPrice учитывает сумму заказа и расстояние', () => {
    const cases = [
      [12, 2500, 250],
      [3, 100, 0],
      [4, 100, 200],
      [10, 2999, 200],
      [11, 100, 225],
      [50, 3000, 0],
    ]
    for (const [distance, total, expected] of cases) {
      assert.equal(menu.deliveryPrice(distance, total), expected, `${distance} км, ${total} руб.`)
    }
  })

  it('printDelivery печатает одну строку по шаблону', () => {
    assert.deepEqual(captureLog(() => menu.printDelivery(12, 2500)).lines, [
      'Расстояние 12 км, заказ 2500 руб.: доставка 250 руб.',
    ])
  })
})

describe('лестница', () => {
  it('пропускает 4-ю ступень и останавливается после 10-й', () => {
    const { value, lines } = captureLog(() => menu.printSteps(12))
    assert.equal(value, 9)
    assert.deepEqual(lines, [
      ...[1, 2, 3, 5, 6, 7, 8, 9, 10].map((step) => `Ступень ${step}`),
      'Дальше лестница не построена',
      'Всего построено: 9',
    ])
  })

  it('граничные высоты', () => {
    assert.deepEqual(captureLog(() => menu.printSteps(0)).lines, ['Всего построено: 0'])
    assert.equal(captureLog(() => menu.printSteps(4)).value, 3)
    assert.ok(!captureLog(() => menu.printSteps(10)).lines.includes('Дальше лестница не построена'))
    assert.ok(captureLog(() => menu.printSteps(11)).lines.includes('Дальше лестница не построена'))
  })
})

describe('ввод', () => {
  it('пустая строка и текст — не числа', () => {
    assert.ok(Number.isNaN(menu.toNumber('')))
    assert.ok(Number.isNaN(menu.toNumber('abc')))
    assert.equal(menu.toNumber(' 12 '), 12)
    assert.equal(menu.isNonNegativeNumber(-1), false)
  })
})

describe('сквозные сценарии из условия', () => {
  it('пункт 1 — билетная касса', () => {
    assert.equal(
      run(1, 2, 2300),
      `${MENU_TEXT}Ваш выбор: Категория билета: Бюджет: ` +
        'Категория 2, билет 500 руб., бюджет 2300 руб.: можно купить 4 шт.\n',
    )
  })

  it('пункт 2 — доставка заказа', () => {
    assert.equal(
      run(2, 12, 2500),
      `${MENU_TEXT}Ваш выбор: Расстояние: Сумма заказа: ` +
        'Расстояние 12 км, заказ 2500 руб.: доставка 250 руб.\n',
    )
  })

  it('пункт 3 — лестница', () => {
    const output = run(3, 12)
    assert.ok(output.startsWith(`${MENU_TEXT}Ваш выбор: Высота лестницы: Ступень 1\n`))
    assert.ok(output.endsWith('Ступень 10\nДальше лестница не построена\nВсего построено: 9\n'))
  })

  it('неизвестный пункт меню', () => {
    for (const choice of [0, 4, 'abc', '']) {
      assert.equal(run(choice), `${MENU_TEXT}Ваш выбор: такой задачи нет\n`)
    }
  })

  it('некорректное число не ломает программу', () => {
    assert.ok(run(2, -5).endsWith('нужно ввести неотрицательное число\n'))
    assert.ok(run(1).endsWith('нужно ввести неотрицательное число\n'))
  })
})
