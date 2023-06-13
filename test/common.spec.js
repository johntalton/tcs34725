import { I2CScriptBus, I2CAddressedBus } from '@johntalton/and-other-delights'
import { Common } from '@johntalton/tcs34725'

import { describe, it } from 'mocha'
import { expect } from 'chai'

const bus = (script) => {
	const b = new I2CScriptBus(script)
	const ab = new I2CAddressedBus(b, 0x00)
	return ab
}

describe('Common', () => {
	describe('getId', () => {
		it('gets id', async () => {
			const id = await Common.getId(bus([
				{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([42]) } }
			]))
			expect(id).to.equal(42)
		})

		describe('getnEnable', () => {
			it('gets enabled', async () => {
				const id = await Common.getEnable(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([0b11011]) } }
				]))
				expect(id).to.deep.equal({
					powerOn: true,
					active: true,
					interrupts: true,
					wait: true
				})
			})
		})

		describe('getWaitTiming', () => {
			it('gets wait timing', async () => {
				const id = await Common.getWaitTiming(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([0]) } }
				]))
				expect(id).to.deep.equal({
					wtime: 0,
					count: 256
				})
			})
		})

		describe('getIntegrationTiming', () => {
			it('gets integration timing', async () => {
				const id = await Common.getIntegrationTiming(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([0]) } }
				]))
				expect(id).to.deep.equal({
					_atime: 0,
					integrationCycles: 256,
					integrationMaxCount: 262144,
					integrationTimeMs: 614.4
				})
			})
		})

		describe('getThreshold', () => {
			it('gets threshold', async () => {
				const id = await Common.getThreshold(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 4, buffer: Uint16Array.from([ 0, 0 ]) } }
				]))
				expect(id).to.deep.equal({
					high: 0,
					low: 0
				})
			})
		})

		describe('getPersistence', () => {
			it('gets persistence', async () => {
				const id = await Common.getPersistence(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0 ]) } }
				]))
				expect(id).to.deep.equal({
					apres: 0
				})
			})
		})

		describe('getConfig', () => {
			it('gets config', async () => {
				const id = await Common.getConfig(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0 ]) } }
				]))
				expect(id).to.deep.equal({
					wlong: false
				})
			})
		})

		describe('getControl', () => {
			it('gets control', async () => {
				const id = await Common.getControl(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0 ]) } }
				]))
				expect(id).to.deep.equal({
					again: 0
				})
			})
		})

		describe('getStatus', () => {
			it('gets status', async () => {
				const id = await Common.getStatus(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0 ]) } }
				]))
				expect(id).to.deep.equal({
					valid: false,
					thresholdViolation: false
				})
			})
		})

		describe('getData', () => {
			it('gets data', async () => {
				const id = await Common.getData(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 8, buffer: Uint16Array.from([
						0, 0, 0, 0
					]) } }
				]))
				expect(id).to.deep.equal({
					raw: { r: 0, g: 0, b: 0, c: 0 },
					ratio: { r: 0, g: 0, b: 0, c: 0 },
					rgb: { r: 0, g: 0, b: 0, zero: true },
					temperatureK: Number.NaN,
					lux: 0
				})
			})
		})

		describe('getProfile', () => {
			it('gets profile', async () => {
				const id = await Common.getProfile(bus([
					{ method: 'readI2cBlock', result: { bytesRead: 20, buffer: Uint8Array.from([
						0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
						0, 0, 0, 0, 0, 0, 0, 0, 0, 0
					]) } }
				]))
				expect(id).to.deep.equal({
					powerOn: false,
					active: false,
					interrupts: false,
					_atime: 0,
					wait: false,
					integrationCycles: 256,
					integrationMaxCount: 262144,
					integrationTimeMs: 614.4,
					threshold: {
						high: 0,
						low: 0
					},
					gain: 0,
					filtering: true,
					valid: false,
					thresholdViolation: false,
					_wlong: false,
					count: 256,
					waitTimeMs: 614.4,
					wtime: 0
				})
			})
		})

	})
})
