import AppKit
import Foundation
import PDFKit

guard CommandLine.arguments.count == 3 else {
  fputs("usage: swift render_pdf_contact_sheet.swift INPUT.pdf OUTPUT.png\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let document = PDFDocument(url: inputURL), document.pageCount > 0 else {
  fputs("unable to open PDF or PDF has no pages\n", stderr)
  exit(3)
}

let columns = 5
let gap: CGFloat = 14
let labelHeight: CGFloat = 20
let thumbnailWidth: CGFloat = 180
var thumbnails: [(NSImage, CGFloat)] = []
var maximumCellHeight: CGFloat = 0

for index in 0..<document.pageCount {
  guard let page = document.page(at: index) else { continue }
  let bounds = page.bounds(for: .mediaBox)
  let thumbnailHeight = thumbnailWidth * bounds.height / bounds.width
  let thumbnail = page.thumbnail(
    of: NSSize(width: thumbnailWidth, height: thumbnailHeight),
    for: .mediaBox
  )
  thumbnails.append((thumbnail, thumbnailHeight))
  maximumCellHeight = max(maximumCellHeight, thumbnailHeight + labelHeight)
}

let rows = Int(ceil(Double(thumbnails.count) / Double(columns)))
let canvasWidth = gap + CGFloat(columns) * (thumbnailWidth + gap)
let canvasHeight = gap + CGFloat(rows) * (maximumCellHeight + gap)
let canvas = NSImage(size: NSSize(width: canvasWidth, height: canvasHeight))

canvas.lockFocus()
NSColor(calibratedWhite: 0.88, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight).fill()

let labelAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .medium),
  .foregroundColor: NSColor.black,
]

for (index, item) in thumbnails.enumerated() {
  let column = index % columns
  let row = index / columns
  let x = gap + CGFloat(column) * (thumbnailWidth + gap)
  let cellTop = canvasHeight - gap - CGFloat(row) * (maximumCellHeight + gap)
  let y = cellTop - item.1
  item.0.draw(
    in: NSRect(x: x, y: y, width: thumbnailWidth, height: item.1),
    from: .zero,
    operation: .copy,
    fraction: 1
  )
  let label = "Page \(index + 1)" as NSString
  label.draw(at: NSPoint(x: x, y: y - labelHeight + 3), withAttributes: labelAttributes)
}

canvas.unlockFocus()

guard
  let tiff = canvas.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let png = bitmap.representation(using: .png, properties: [:])
else {
  fputs("unable to encode contact sheet PNG\n", stderr)
  exit(4)
}

try png.write(to: outputURL)
print("rendered \(document.pageCount) PDF pages to \(outputURL.path)")
