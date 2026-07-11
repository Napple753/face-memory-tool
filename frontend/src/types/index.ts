// Shared TypeScript interfaces.
// To implement:
//
// export interface Member {
//   id: string              // hidden internal ID
//   name: string
//   division: string
//   answerText: string      // combined columns, separator/line-break applied
//   photoBase64?: string
// }
//
// export interface FaceBox {
//   memberId: string | null
//   x: number
//   y: number
//   w: number
//   h: number
//   location: 'in-photo' | 'bottom-grid' | 'placeholder'
// }
//
// export interface ColumnMapping {
//   nameColumn: string
//   divisionColumn: string
//   photoColumn?: string
//   answerColumns: string[]
//   answerSeparator: string
// }
//
// export interface ProgressExport {
//   formatVersion: number   // increment on every breaking change to this shape
//   columnMapping: ColumnMapping
//   members: Member[]
//   boxes: FaceBox[]
// }
