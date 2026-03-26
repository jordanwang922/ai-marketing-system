import AppKit
import Foundation
import Vision

struct OCRResult: Encodable {
  let path: String
  let text: String
}

func recognizeText(at path: String) -> String {
  let url = URL(fileURLWithPath: path)
  guard
    let image = NSImage(contentsOf: url),
    let tiffData = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiffData),
    let cgImage = bitmap.cgImage
  else {
    return ""
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["zh-Hans", "en-US"]

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

  do {
    try handler.perform([request])
    let observations = request.results ?? []
    let lines = observations
      .compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    return lines.joined(separator: "\n")
  } catch {
    return ""
  }
}

let paths = Array(CommandLine.arguments.dropFirst())
let results = paths.map { OCRResult(path: $0, text: recognizeText(at: $0)) }
let encoder = JSONEncoder()

do {
  let data = try encoder.encode(results)
  FileHandle.standardOutput.write(data)
} catch {
  FileHandle.standardOutput.write(Data("[]".utf8))
}
