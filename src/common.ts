import { I2CAddressedBus } from '@johntalton/and-other-delights'

import {
	Threshold,
	Enable,
	IntegrationTimingParts,
	WaitTiming,
	Persistence,
	Control,
	Status,
	Configuration,
	Data,
	FriendlyProfile,
	Profile
} from './types.js'
import { Converter } from './converter.js'
import {
	Registers,
	makeCommand,
	COMMAND_BULK_DATA,
	COMMAND_BULK_PROFILE,
	COMMAND_BULK_THRESHOLD
} from './defs.js'

export class Common {
	static async getId(bus: I2CAddressedBus): Promise<number> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.ID), 1)
		return Converter.parseId(buffer)
	}

	static async getEnable(bus: I2CAddressedBus): Promise<Enable> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.ENABLE), 1)
		return Converter.parseEnable(buffer)
	}

	static async setEnable(bus: I2CAddressedBus, enable: Enable): Promise<void> {
		const enableBuffer = Converter.encodeEnable(enable)
		return bus.writeI2cBlock(makeCommand(Registers.ENABLE), enableBuffer)
	}

	static async getIntegrationTiming(bus: I2CAddressedBus): Promise<IntegrationTimingParts> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.ATIME), 1)
		return Converter.parseIntegrationTiming(buffer)
	}

	static async setIntegrationTime(bus: I2CAddressedBus, ms: number) {
		const buffer = Converter.encodeIntegrationTimingMs(ms)
		return bus.writeI2cBlock(makeCommand(Registers.ATIME), buffer)
	}

	static async getWaitTiming(bus: I2CAddressedBus): Promise<WaitTiming> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.WTIME), 1)
		return Converter.parseWaitTiming(buffer)
	}

	static async setWaitTiming(bus: I2CAddressedBus, count: number) {
		const buffer = Converter.encodeWTimingCount(count)
		return bus.writeI2cBlock(makeCommand(Registers.WTIME), buffer)
	}

	static async setWaitTimingMs(bus: I2CAddressedBus, ms: number, assumedWlong: boolean) {
		const buffer = Converter.encodeWTiming(ms, assumedWlong)
		return bus.writeI2cBlock(makeCommand(Registers.WTIME), buffer)
	}

	static async getThreshold(bus: I2CAddressedBus): Promise<Threshold> {
		const buffer = await bus.readI2cBlock(COMMAND_BULK_THRESHOLD, 4)
		return Converter.parseThreshold(buffer)
	}

	static async setThreshold(bus: I2CAddressedBus, threshold: Threshold): Promise<void> {
		const thresholdBytes = Converter.encodeThreshold(threshold)
		return bus.writeI2cBlock(COMMAND_BULK_THRESHOLD, thresholdBytes)
	}

	// static async setThreshold(bus: I2CAddressedBus, threshold: Threshold): Promise<void> {
	// 	// console.log('setting threshold', threshold)
	// 	// todo only set `high` or `low` if they exist / not undefined
	// 	const thresholdBytes = Converter.encodeThreshold(threshold)
	// 	return Promise.all([
	// 		bus.writeI2cBlock(makeCommand(Registers.AILTL), thresholdBytes[0]),
	// 		bus.writeI2cBlock(makeCommand(Registers.AILTH), thresholdBytes[1]),
	// 		bus.writeI2cBlock(makeCommand(Registers.AIHTL), thresholdBytes[2]),
	// 		bus.writeI2cBlock(makeCommand(Registers.AIHTH), thresholdBytes[3])
	// 	])
	// }

	static async getPersistence(bus: I2CAddressedBus) {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.PERS), 1)
		return Converter.parsePersistence(buffer)
	}

	static async setPersistence(bus: I2CAddressedBus, persistence: Persistence) {
		const buffer = Converter.encodePersistence(persistence)
		return bus.writeI2cBlock(makeCommand(Registers.PERS), buffer)
	}

	static async getConfig(bus: I2CAddressedBus): Promise<Configuration> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.CONFIG), 1)
		return Converter.parseConfiguration(buffer)
	}

	static async setConfig(bus: I2CAddressedBus, config: Configuration) {
		const buffer = Converter.encodeConfiguration(config)
		return bus.writeI2cBlock(makeCommand(Registers.CONFIG), buffer)
	}

	static async getControl(bus: I2CAddressedBus) {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.CONTROL), 1)
		return Converter.parseControl(buffer)
	}

	static async setControl(bus: I2CAddressedBus, control: Control) {
		const buffer = Converter.encodeControl(control)
		return bus.writeI2cBlock(makeCommand(Registers.CONTROL), buffer)
	}

	static async getProfile(bus: I2CAddressedBus): Promise<FriendlyProfile> {
		const buffer = await bus.readI2cBlock(COMMAND_BULK_PROFILE, 20)
		const buffer8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const enable = Converter.parseEnable(buffer8.subarray(0, 1))
		const integrationTiming = Converter.parseIntegrationTiming(buffer8.subarray(1, 2))
		const waitTiming = Converter.parseWaitTiming(buffer8.subarray(3, 4))
		const threshold = Converter.parseThreshold(buffer8.subarray(4, 8))
		const persistence = Converter.parsePersistence(buffer8.subarray(12, 13))
		const config = Converter.parseConfiguration(buffer8.subarray(13, 14))
		const control = Converter.parseControl(buffer8.subarray(15, 16))
		const status = Converter.parseStatus(buffer8.subarray(19, 20))

		//
		return Converter.parseProfile([
			enable,
			integrationTiming,
			waitTiming,
			threshold,
			persistence,
			config,
			control,
			status
		])
	}

	static async setProfile(_bus: I2CAddressedBus, _profile: Profile): Promise<void> {
		throw new Error('no impl')
		// 	const enable = Converter.encodeEnable(profile) // todo do not pass entire profile
		// 	const [wtime, wlong] = Converter.encodeWTimingMs(profile.waitTimeMs)
		// 	const threshold = profile.threshold || { low: profile.low, high: profile.high }
		// 	const persistence = Converter.encodePersistence(profile.filtering)
		// 	const config = Converter.encodeConfiguration({ wlong })
		// 	const control = Converter.encodeControl(profile.gain)

		// 	// sets all independently, though, all may not run in order
		// 	await Promise.all([
		// 		Common.setIntegrationTiming(bus, profile.integrationTimeMs),
		// 		Common.setWaitTiming(bus, wtime),
		// 		Common.setThreshold(bus, threshold),
		// 		Common.setPersistence(bus, persistence),
		// 		Common.setConfig(bus, config),
		// 		Common.setControl(bus, control)
		// 	])

		// 	await Common.setEnabled(bus, enable)
	}

	static setIntegrationTiming(_bus: I2CAddressedBus, _integrationTimeMs: number) {
		throw new Error('Method not implemented.')
	}

	static async getStatus(bus: I2CAddressedBus): Promise<Status> {
		const buffer = await bus.readI2cBlock(makeCommand(Registers.STATUS), 1)
		return Converter.parseStatus(buffer)
	}

	static async clearInterrupt(_bus: I2CAddressedBus): Promise<void> {
		// console.log('clearing interrupt')
		// return bus.writeSpecial(COMMAND_CLEAR)
		throw new Error('what is write special')
	}

	static async getData(bus: I2CAddressedBus): Promise<Data> {
		const buffer = await bus.readI2cBlock(COMMAND_BULK_DATA, 8)

		const view = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new DataView(buffer)

		const c = view.getUint16(0, true)
		const r = view.getUint16(2, true)
		const g = view.getUint16(4, true)
		const b = view.getUint16(6, true)

		// const c = (buffer.readUInt8(1) << 8) | buffer.readUInt8(0)

		return Converter.formatData({ r: r, g: g, b: b, c: c })
	}
}
