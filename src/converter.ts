import { I2CBufferSource } from '@johntalton/and-other-delights'

import { APRES_ENUM_MAP, GAIN_ENUM_MAP, Masks } from './defs.js'
import { Enable, WaitTiming, IntegrationTimingParts, Threshold, Persistence, Configuration, Status, Control, Profile, RGBC, Data, RGBCRatio, ProfileParts, FriendlyProfile } from './types.js'

export class Converter {
	static formatWaitTiming(waitTiming: WaitTiming, wlong: boolean) {
		// docs suggest twos compliment encoded value
		const waitTimeMs = waitTiming.count * 2.4 * (wlong ? 12 : 1)
		return {
			...waitTiming,
			_wlong: wlong,
			waitTimeMs
		}
	}

	// ---------------------------------------------------------------------------

	static parseProfile(parts: ProfileParts): FriendlyProfile {
		const [
			enable,
			integrationTiming,
			waitTiming,
			threshold,
			persistence,
			config,
			control,
			status
		] = parts

		const filtering = APRES_ENUM_MAP.find(ap => ap.name === persistence.apres) ? true : false
		const gain = GAIN_ENUM_MAP.find(g => g.name === control.again)?.name ?? 0

		return {
			...enable,
			...Converter.formatWaitTiming(waitTiming, config.wlong),
			...integrationTiming,
			threshold,
			// ...threshold,
			filtering,
			gain,

			...status
		}
	}

	static parseId(buffer: I2CBufferSource): number {
		const bufferU8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		return bufferU8[0]
	}

	static parseEnable(buffer: I2CBufferSource): Enable {
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Int8Array(buffer)

		const [ value ] = buffer8

		return {
			powerOn: (value & Masks.ENABLE_PON) === Masks.ENABLE_PON,
			active: (value & Masks.ENABLE_AEN) === Masks.ENABLE_AEN,
			wait: (value & Masks.ENABLE_WEN) === Masks.ENABLE_WEN,
			interrupts: (value & Masks.ENABLE_AIEN) === Masks.ENABLE_AIEN
		}
	}

	static parseWaitTiming(buffer: I2CBufferSource): WaitTiming {
		const bufferU8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const [ wtime ] = bufferU8
		const count = 256 - wtime

		return {
			wtime,
			count
		}
	}

	static parseIntegrationTiming(buffer: I2CBufferSource): IntegrationTimingParts {
		const bufferU8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const [ _atime ] = bufferU8

		const integrationCycles = 256 - _atime
		const integrationMaxCount = integrationCycles * 1024
		const integrationTimeMs = integrationCycles * 2.4
		return {
			_atime,
			integrationCycles,
			integrationMaxCount,
			integrationTimeMs
		}
	}

	static parseThreshold(buffer: I2CBufferSource): Threshold {
		const view = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new DataView(buffer)

		const low = view.getUint16(0, true)
		const high = view.getUint16(2, true)

		return {
			low: low,
			high: high
		}
	}

	static parsePersistence(buffer: I2CBufferSource): Persistence {
		const bufferU8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const apres = bufferU8[0] & Masks.PRES_APRES
		return { apres }
	}

	static parseConfiguration(buffer: I2CBufferSource): Configuration {
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Int8Array(buffer)

		const [ value ] = buffer8
		return { wlong: (value & Masks.CONFIG_WLONG) === Masks.CONFIG_WLONG }
	}

	static parseStatus(buffer: I2CBufferSource): Status {
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Int8Array(buffer)

		const [ value ] = buffer8
		const aint = (value & Masks.STATUS_AINT) === Masks.STATUS_AINT
		const avalid = (value & Masks.STATUS_AVALID) === Masks.STATUS_AVALID
		return {
			valid: avalid,
			thresholdViolation: aint
		}
	}

	static parseControl(buffer: I2CBufferSource): Control {
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Int8Array(buffer)

		const [ value ] = buffer8
		const again = value & Masks.CONTROL_AGAIN
		return { again: again }
	}

	// ---------------------------------------------------------------------------
	static encodeEnable(enable: Enable | Profile): ArrayBuffer {
		return Uint8Array.from([
			(enable.interrupts ? Masks.ENABLE_AIEN : 0) |
			(enable.wait ? Masks.ENABLE_WEN : 0) |
			(enable.active ? Masks.ENABLE_AEN : 0) |
			(enable.powerOn ? Masks.ENABLE_PON : 0)
		])
	}

	static encodeIntegrationTimingMs(ms: number): ArrayBuffer {
		const count = Math.floor(ms / 2.4)
		if (count > 256) { throw new Error('timing ms out of range: ' + ms) }
		return Uint8Array.from([ 256 - count ])
	}

	static encodeWTimingMs(ms: number, _requestedWaitLong?: boolean): [ ArrayBuffer, ArrayBuffer ] {
		const MAX_STEPS = 256
		const STEP_UNIT_SIZE_MS = 2.4
		const LONG_STEP_MULTIPLIER = 12

		const LONG_STEP_MS = LONG_STEP_MULTIPLIER * STEP_UNIT_SIZE_MS
		const STEP_MS = STEP_UNIT_SIZE_MS

		const RANGE = { low: STEP_MS, high: MAX_STEPS * STEP_MS }
		// const LONG_RANGE = { low: LONG_STEP_MS, high: MAX_STEPS * LONG_STEP_MS }

		// continue using the higher resolution timing calculation
		// until it is no-longer in range.  Then switch to the 12x.
		// todo this choice can be used for fingerprinting
		const assumedWlong = ms > RANGE.high

		const waitCount = Math.trunc(ms / (assumedWlong ? LONG_STEP_MS : STEP_MS))
		if ((waitCount <= 0) || (waitCount > 256)) { throw new Error('invlaid wait count: ' + waitCount) }

		return [
			Converter.encodeWTimingCount(waitCount),
			Converter.encodeConfiguration({ wlong: assumedWlong })
		]
	}

	static encodeWTimingCount(count: number): ArrayBuffer {
		if (count < 0 || count > 256) { throw new Error('count out of range: ' + count) }
		return Uint8Array.from([ 256 - count ])
	}

	static encodeWTiming(ms: number, assumedWlong: boolean) {
		const count = Math.floor(ms / 2.4 / (assumedWlong ? 12 : 1)) // SUS
		return Converter.encodeWTimingCount(count)
	}

	static encodeThreshold(threshold: Threshold): ArrayBuffer {
		const { low, high } = threshold
		return Uint8Array.from([
			low & 0xFF, low >> 8 & 0xFF,
			high & 0xFF, high >> 8 & 0xFF
		])
	}

	static encodePersistence(persistence: Persistence): ArrayBuffer {
		const value = APRES_ENUM_MAP.find(ap => ap.name === persistence.apres) ?? { value: 0 }
		return Uint8Array.from([ value.value ])
	}

	static encodeConfiguration(config: Configuration): ArrayBuffer {
		const { wlong } = config
		return Uint8Array.from([ wlong ? Masks.CONFIG_WLONG : 0 ])
	}

	static encodeControl(control: Control): ArrayBuffer {
		const { again } = control
		const value = GAIN_ENUM_MAP.find(g => g.name === again) ?? { value: 0 }
		return Uint8Array.from([ value.value ])
	}

	// ---------------------------------------------------------------------------

	static formatData(data: RGBC): Data {
		const lt = Converter.calculateLuxAndTemperature(data)
		return {
			raw: data,
			ratio: Converter.calculateRatio(data),
			rgb: Converter.calculateRGB(data),
			lux: lt.lux,
			temperatureK: lt.temperatureK
		}
	}

	static calculateRatio(raw: RGBC): RGBCRatio {
		return {
			r: raw.r / 0xFFFF,
			g: raw.g / 0xFFFF,
			b: raw.b / 0xFFFF,
			c: raw.c !== undefined ? raw.c / 0XFFFF : 0
		}
	}

	static calculateRGB(raw: RGBC): RGBC {
		if (raw.c === undefined || raw.c <= 0) { return { r: 0, g: 0, b: 0, zero: true } }

		// software scaling?
		// r = pow(raw.r / raw.c, scaling) * 255.0
		// g = pow(raw.g / raw.c, scaling) * 255.0
		// b = pow(raw.b / raw.c, scaling) * 255.0

		const red = raw.r / raw.c
		const green = raw.g / raw.c
		const blue = raw.b / raw.c

		// const r = Math.trunc(Math.pow(Math.trunc(red * 256) / 255, 2.5) * 255)
		// const g = Math.trunc(Math.pow(Math.trunc(green * 256) / 255, 2.5) * 255)
		// const b = Math.trunc(Math.pow(Math.trunc(blue * 256) / 255, 2.5) * 255)

		const r = Math.trunc(red * 255)
		const g = Math.trunc(green * 255)
		const b = Math.trunc(blue * 255)

		return { r: r, g: g, b: b, c: raw.c }
	}

	static calculateLuxAndTemperature(raw: RGBC) {
		const { r, g, b } = raw

		// taken from adafruit version, not sure source or assumptions

		const x = -0.14282 * r + 1.54924 * g + -0.95641 * b
		const y = -0.32466 * r + 1.57837 * g + -0.73191 * b
		const z = -0.68202 * r + 0.77073 * g + 0.56332 * b

		const xc = x / (x + y + z)
		const yc = y / (x + y + z)

		const n = (xc - 0.3320) / (0.1858 - yc)
		const cct = 449.0 * Math.pow(n, 3) +
			3525.0 * Math.pow(n, 2) +
			6823.3 * n +
			5520.33

		return { lux: y, temperatureK: cct }
	}
}
