import { Converter } from '@johntalton/tcs34725'

import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Converter', () => {
	describe('[parse]', () => {
		describe('parseId', () => {
			it('undefined', () => {
				const id = Converter.parseId(undefined)
				expect(id).to.equal(undefined)
			})

			it('empty', () => {
				const ab = new ArrayBuffer()
				const id = Converter.parseId(ab)
				expect(id).to.equal(undefined)
			})

			it('buffer', () => {
				const ab = Uint8Array.from([ 42, 0 ])
				const id = Converter.parseId(ab)
				expect(id).to.equal(42)
			})

			it('offset view', () => {
				const ab = Uint8Array.from([ 0, 0, 42, 0, 0 ])
				const u8 = new Uint8Array(ab.buffer, 2, 1)
				const id = Converter.parseId(u8)
				expect(id).to.equal(42)
			})
		})

		describe('parseEnable', () => {
			it('undefined', () => {
				const profile = Converter.parseEnable(undefined)
				expect(profile).to.deep.equal({
					active: false,
					interrupts: false,
					powerOn: false,
					wait: false
				})
			})
		})

		describe('parseWaitTiming', () => {
			it('undefined', () => {
				const wt = Converter.parseWaitTiming(undefined)
				expect(wt).to.deep.equal({
					wtime: undefined,
					count: Number.NaN
				})
			})
		})

		describe('parseIntegrationTiming', () => {
			it('undefined', () => {
				const t = Converter.parseIntegrationTiming(undefined)
				expect(t).to.deep.equal({
					_atime: undefined,
					integrationCycles: Number.NaN,
					integrationMaxCount: Number.NaN,
					integrationTimeMs: Number.NaN
				})
			})
		})

		describe('parseThreshold', () => {
			it('undefined', () => {
				expect(() => Converter.parseThreshold(undefined)).to.throw()
			})

			it('empty', () => {
				expect(() => Converter.parseThreshold(new ArrayBuffer())).to.throw()
			})
		})

		describe('parsePersistence', () => {
			it('undefined', () => {
				const p = Converter.parsePersistence(undefined)
				expect(p).to.deep.equal({
					apres: 0
				})
			})
		})

		describe('parseConfiguration', () => {
			it('undefined', () => {
				const c = Converter.parseConfiguration(undefined)
				expect(c).to.deep.equal({
					wlong: false
				})
			})
		})

		describe('parseStatus', () => {
			it('undefined', () => {
				const s = Converter.parseStatus(undefined)
				expect(s).to.deep.equal({
					valid: false,
					thresholdViolation: false
				})
			})
		})

		describe('parseControl', () => {
			it('undefined', () => {
				const c = Converter.parseControl(undefined)
				expect(c).to.deep.equal({
					again: 0
				})
			})
		})
	})

	describe('[encode]', () => {
		describe('encodeEnable', () => {
			it('empty', () => {
				const ab = Converter.encodeEnable({ })
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})

		describe('encodeIntegrationTimingMs', () => {
			it('empty', () => {
				const ab = Converter.encodeIntegrationTimingMs(0)
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})

		describe('encodeWTimingMs', () => {
			it('empty', () => {
				const [ count, config ] = Converter.encodeWTimingMs(3, false)
				expect(count[0]).to.equal(255)
				expect(config[0]).to.equal(0)
			})
		})

		describe('encodeWTimingCount', () => {
			it('empty', () => {
				const ab = Converter.encodeWTimingCount(0)
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})

		describe('encodeWTiming', () => {
			it('empty', () => {
				const ab = Converter.encodeWTiming(3, false)
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 255 ])
			})
		})

		describe('encodeThreshold', () => {
			it('empty', () => {
				const ab = Converter.encodeThreshold({ })
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(4)
				expect([ ...ab ]).to.deep.equal([ 0, 0, 0, 0 ])
			})
		})

		describe('encodePersistence', () => {
			it('empty', () => {
				const ab = Converter.encodePersistence({ })
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})

		describe('encodeConfiguration', () => {
			it('empty', () => {
				const ab = Converter.encodeConfiguration({ })
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})

		describe('encodeControl', () => {
			it('empty', () => {
				const ab = Converter.encodeControl({ })
				expect(ab).to.not.be.undefined
				expect(ab.byteLength).to.equal(1)
				expect([ ...ab ]).to.deep.equal([ 0 ])
			})
		})
	})

	describe('[RGB]', () => {
		describe('formatData', () => {
			it('undefined', () => {
				const data = Converter.formatData({ })
				expect(data).to.deep.equal({
					raw: {},
					ratio: { r: Number.NaN, g: Number.NaN, b: Number.NaN, c: 0 },
					rgb: { r: 0, g: 0, b: 0, zero: true },
					lux: Number.NaN,
					temperatureK: Number.NaN
				})
			})
		})

		describe('calculateRatio', () => {
			it('undefined', () => {
				const ratio = Converter.calculateRatio({ })
				expect(ratio).to.deep.equal({
					r: Number.NaN, g: Number.NaN, b: Number.NaN, c: 0
				})
			})
		})

		describe('calculateRGB', () => {
			it('undefined', () => {
				const color = Converter.calculateRGB({ })
				expect(color).to.deep.equal({
					r: 0, g: 0, b: 0,
					zero: true
				})
			})
		})

		describe('calculateLuxAndTemperature', () => {
			it('undefined', () => {
				const lt = Converter.calculateLuxAndTemperature({ })
				expect(lt).to.deep.equal({
					lux: Number.NaN,
					temperatureK: Number.NaN
				})
			})
		})
	})

	describe('[misc]', () => {
		describe('parseProfile', () => {

		})
	})
})
