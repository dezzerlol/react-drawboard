import { Drawing, Drawings, Point, PointPosition, PolygonDrawing, TwoPoints } from '@/types'

export const resizePoints = (clientX: number, clientY: number, position: PointPosition, points: TwoPoints) => {
  const { x1, y1, x2, y2 } = points
  switch (position) {
    case 'top-left':
    case 'start':
      return { x1: clientX, y1: clientY, x2, y2 }

    case 'top-right':
      return { x1, y1: clientY, x2: clientX, y2 }

    case 'bottom-left':
      return { x1: clientX, y1, x2, y2: clientY }

    case 'end':
    case 'bottom-right':
      return { x1, y1, x2: clientX, y2: clientY }

    default:
      return { x1, y1, x2, y2 }
  }
}

export const getElementAtPoints = (x: number, y: number, elements: Drawings) => {
  const element = elements
    .map((element) => ({ ...element, position: posWithinDrawing(x, y, element) }))
    .find((el) => el.position !== null)

  return element
}

export const adjustDrawingPoints = (element: PolygonDrawing) => {
  const { x1, y1, x2, y2, tool } = element

  if (tool === 'line') {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 }
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 }
    }
  }

  if (tool === 'rectangle') {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    return { x1: minX, y1: minY, x2: maxX, y2: maxY }
  }

  return { x1, y1, x2, y2 }
}

export const calcElementOffsets = (element: Drawing, { x, y }: Point) => {
  if (element.tool === 'pen') {
    return {
      offsetX: element.points.map((point) => x - point.x),
      offsetY: element.points.map((point) => y - point.y),
    }
  } else {
    return {
      offsetX: x - element.x1,
      offsetY: y - element.y1,
    }
  }
}

export function scalePoints(p1: Point, scale: number) {
  return { x: p1.x / scale, y: p1.y / scale }
}

export function addPoints(p1: Point, p2: Point) {
  return { x: p1.x + p2.x, y: p1.y + p2.y }
}

export function diffPoints(p1: Point, p2: Point) {
  return { x: p1.x - p2.x, y: p1.y - p2.y }
}

const posWithinDrawing = (x: number, y: number, element: Drawing) => {
  const { tool, x1, x2, y1, y2 } = element

  switch (tool) {
    case 'line':
    case 'arrow':
      const on = onLine(x1, y1, x2, y2, x, y)
      const start = nearPoint(x, y, x1, y1, 'start')
      const end = nearPoint(x, y, x2, y2, 'end')
      return start || end || on

    case 'rectangle':
      const topLeft = nearPoint(x, y, x1, y1, 'top-left')
      const topRight = nearPoint(x, y, x2, y1, 'top-right')
      const bottomLeft = nearPoint(x, y, x1, y2, 'bottom-left')
      const bottomRight = nearPoint(x, y, x2, y2, 'bottom-right')
      const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? 'inside' : null
      return topLeft || topRight || bottomLeft || bottomRight || inside

    case 'circle':
      const center = nearPoint(x, y, (x1 + x2) / 2, (y1 + y2) / 2, 'center')
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2
      const onCircle = Math.pow(x - (x1 + x2) / 2, 2) + Math.pow(y - (y1 + y2) / 2, 2) <= Math.pow(radius, 2)
      return center || (onCircle ? 'inside' : null)

    case 'rhombus':
      const top = nearPoint(x, y, (x1 + x2) / 2, y1, 'top')
      const bottom = nearPoint(x, y, (x1 + x2) / 2, y2, 'bottom')
      const left = nearPoint(x, y, x1, (y1 + y2) / 2, 'left')
      const right = nearPoint(x, y, x2, (y1 + y2) / 2, 'right')
      const insideRhombus = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? 'inside' : null
      return top || bottom || left || right || insideRhombus

    case 'triangle':
      const rightTriangle = nearPoint(x, y, x1, y2, 'right')
      const equilateralTriangle = nearPoint(x, y, x1, y2, 'left')
      const insideTriangle = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? 'inside' : null
      return rightTriangle || equilateralTriangle || insideTriangle

    case 'pen':
      const betweenAnyPoint = element.points.some((point: Point, index: number) => {
        const nextPoint = element.points[index + 1]
        if (!nextPoint) return false
        return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null
      })
      return betweenAnyPoint ? 'inside' : null

    case 'text':
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? 'inside' : null

    case 'image':
      return null

    default:
      throw new Error(`Type not recognised: ${tool}`)
  }
}

const onLine = (x1: number, y1: number, x2: number, y2: number, x: number, y: number, maxDistance = 1) => {
  const a = { x: x1, y: y1 }
  const b = { x: x2, y: y2 }
  const c = { x, y }
  const offset = distance(a, b) - (distance(a, c) + distance(b, c))
  return Math.abs(offset) < maxDistance ? 'inside' : null
}

const nearPoint = (x: number, y: number, x1: number, y1: number, name: PointPosition) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null
}

const distance = (a: Point, b: Point) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
