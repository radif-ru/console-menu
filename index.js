/**
 * Консольное меню: пользователь выбирает задачу, вводит числа и получает результат.
 *
 * Запуск: node index.js
 *
 * Ввод через readline — только в main(); вычисляющие функции возвращают
 * значение, печатающие — выводят одну готовую строку.
 */

const readline = require('node:readline')

const MENU = ['Выберите задачу:', '1 — билетная касса', '2 — доставка заказа', '3 — лестница']
const UNKNOWN_TASK = 'такой задачи нет'
const UNKNOWN_CATEGORY = 'неизвестная категория'
const INVALID_NUMBER = 'нужно ввести неотрицательное число'

const FREE_DELIVERY_TOTAL = 3000
const FREE_DELIVERY_KM = 3
const BASE_DELIVERY_KM = 10
const BASE_DELIVERY_PRICE = 200
const PRICE_PER_EXTRA_KM = 25

const SKIPPED_STEP = 4
const LAST_BUILT_STEP = 10

/**
 * Превращает ответ пользователя в число; пустой ответ — NaN, а не 0.
 * @param {string} answer
 * @returns {number}
 */
function toNumber(answer) {
  return answer.trim() === '' ? NaN : Number(answer)
}

/**
 * Проверяет, что значение — конечное неотрицательное число.
 * @param {number} value
 * @returns {boolean}
 */
function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0
}

/**
 * Создаёт функцию «задать вопрос → получить строку ответа».
 *
 * Строки читаются из асинхронного итератора readline, который буферизует ввод:
 * ответы, поданные заранее (`printf '1\n2\n2300\n' | node index.js`), не теряются,
 * в отличие от rl.question(). После конца ввода возвращается пустая строка.
 * @param {readline.Interface} rl
 * @returns {(question: string) => Promise<string>}
 */
function createAsk(rl) {
  const lines = rl[Symbol.asyncIterator]()
  let closed = false
  rl.once('close', () => {
    closed = true
  })
  return async (question) => {
    if (closed) {
      return ''
    }
    rl.setPrompt(question)
    rl.prompt()
    const { value, done } = await lines.next()
    return done ? '' : value
  }
}

/**
 * Задаёт вопрос и возвращает введённое неотрицательное число или null.
 * @param {(question: string) => Promise<string>} ask
 * @param {string} question
 * @returns {Promise<number | null>}
 */
async function askNumber(ask, question) {
  const value = toNumber(await ask(question))
  if (isNonNegativeNumber(value)) {
    return value
  }
  console.log(INVALID_NUMBER)
  return null
}

// --- 1. Билетная касса ---

/**
 * Цена билета по категории: 1 — 300, 2 — 500, 3 — 900, иначе 0.
 * @param {number} category
 * @returns {number}
 */
function ticketPrice(category) {
  switch (category) {
    case 1:
      return 300
    case 2:
      return 500
    case 3:
      return 900
    default:
      return 0
  }
}

/**
 * Сколько билетов по цене price можно купить на budget — без деления и округления.
 * @param {number} budget
 * @param {number} price
 * @returns {number}
 */
function maxTickets(budget, price) {
  if (price <= 0) {
    return 0
  }
  let rest = budget
  let count = 0
  while (rest >= price) {
    rest -= price
    count++
  }
  return count
}

/**
 * Печатает чек покупки билетов или сообщение о неизвестной категории.
 * @param {number} category
 * @param {number} budget
 */
function printTicketResult(category, budget) {
  const price = ticketPrice(category)
  if (price === 0) {
    console.log(UNKNOWN_CATEGORY)
    return
  }
  const count = maxTickets(budget, price)
  console.log(`Категория ${category}, билет ${price} руб., бюджет ${budget} руб.: можно купить ${count} шт.`)
}

// --- 2. Доставка заказа ---

/**
 * Стоимость доставки: от 3000 руб. или до 3 км — бесплатно, до 10 км — 200 руб.,
 * дальше — 200 руб. и 25 руб. за каждый километр после десятого.
 * @param {number} distance
 * @param {number} total
 * @returns {number}
 */
function deliveryPrice(distance, total) {
  if (total >= FREE_DELIVERY_TOTAL || distance <= FREE_DELIVERY_KM) {
    return 0
  }
  const extraKm = distance > BASE_DELIVERY_KM ? distance - BASE_DELIVERY_KM : 0
  return BASE_DELIVERY_PRICE + extraKm * PRICE_PER_EXTRA_KM
}

/**
 * Печатает расстояние, сумму заказа и стоимость доставки одной строкой.
 * @param {number} distance
 * @param {number} total
 */
function printDelivery(distance, total) {
  const price = deliveryPrice(distance, total)
  console.log(`Расстояние ${distance} км, заказ ${total} руб.: доставка ${price} руб.`)
}

// --- 3. Лестница ---

/**
 * Печатает построенные ступени: 4-я пропускается (continue), после 10-й
 * строительство останавливается (break). Возвращает число построенных ступеней.
 * @param {number} height
 * @returns {number}
 */
function printSteps(height) {
  let built = 0
  for (let step = 1; step <= height; step++) {
    if (step === SKIPPED_STEP) {
      continue
    }
    if (step > LAST_BUILT_STEP) {
      console.log('Дальше лестница не построена')
      break
    }
    console.log(`Ступень ${step}`)
    built++
  }
  console.log(`Всего построено: ${built}`)
  return built
}

// --- Меню ---

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = createAsk(rl)

  console.log(MENU.join('\n'))
  const choice = toNumber(await ask('Ваш выбор: '))

  switch (choice) {
    case 1: {
      const category = toNumber(await ask('Категория билета: '))
      const budget = await askNumber(ask, 'Бюджет: ')
      if (budget !== null) {
        printTicketResult(category, budget)
      }
      break
    }
    case 2: {
      const distance = await askNumber(ask, 'Расстояние: ')
      const total = distance === null ? null : await askNumber(ask, 'Сумма заказа: ')
      if (total !== null) {
        printDelivery(distance, total)
      }
      break
    }
    case 3: {
      const height = await askNumber(ask, 'Высота лестницы: ')
      if (height !== null) {
        printSteps(height)
      }
      break
    }
    default:
      console.log(UNKNOWN_TASK)
  }

  rl.close()
}

if (require.main === module) {
  main()
}

module.exports = {
  toNumber,
  isNonNegativeNumber,
  ticketPrice,
  maxTickets,
  printTicketResult,
  deliveryPrice,
  printDelivery,
  printSteps,
}
