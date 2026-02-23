import Foundation
import AVFoundation
import AppKit

if CommandLine.arguments.count < 4 {
  fputs("Usage: extract_frames <videoPath> <outputDir> <timesCommaSeparated>\n", stderr)
  exit(1)
}

let videoPath = CommandLine.arguments[1]
let outputDir = CommandLine.arguments[2]
let times = CommandLine.arguments[3].split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }

let asset = AVAsset(url: URL(fileURLWithPath: videoPath))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true

try? FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

for t in times {
  let time = CMTime(seconds: t, preferredTimescale: 600)
  do {
    let cgImage = try generator.copyCGImage(at: time, actualTime: nil)
    let rep = NSBitmapImageRep(cgImage: cgImage)
    guard let data = rep.representation(using: .png, properties: [:]) else { continue }
    let file = "\(outputDir)/frame_\(String(format: "%.1f", t)).png"
    try data.write(to: URL(fileURLWithPath: file))
    print("Wrote \(file)")
  } catch {
    fputs("Failed at \(t)s: \(error)\n", stderr)
  }
}
