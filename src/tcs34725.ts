import { I2CAddressedBus } from '@johntalton/and-other-delights'

import { Common } from './common.js'
import {
	Configuration,
	Enable,
	Threshold
} from './types.js'

export class TCS34725 {
	#bus: I2CAddressedBus

	static from(bus: I2CAddressedBus, _options: Map<unknown, unknown>) {
		return new TCS34725(bus, _options)
	}

	constructor(bus: I2CAddressedBus, _options: Map<unknown, unknown>) { this.#bus = bus }

	get name() { return this.#bus.name }

	close() { return this.#bus.close() }

	async id() { return Common.getId(this.#bus) }
	async status() { return Common.getStatus(this.#bus) }
	async clearInterrupt() { return Common.clearInterrupt(this.#bus) }

	async getEnabled() { return Common.getEnable(this.#bus) }
	async getThreshold() { return Common.getThreshold(this.#bus) }
	async getProfile() { return Common.getProfile(this.#bus) }
	async getData() { return Common.getData(this.#bus) }

	async setEnable(enable: Enable) { return Common.setEnable(this.#bus, enable) }
	async setIntegrationTime(ms: number) { return Common.setIntegrationTime(this.#bus, ms) }
	async setWaitTiming(count: number) { return Common.setWaitTiming(this.#bus, count) }
	async setWaitTimingMs(ms: number, assumedWlong: boolean) { return Common.setWaitTimingMs(this.#bus, ms, assumedWlong) }
	async setConfig(config: Configuration) { return Common.setConfig(this.#bus, config) }
	async setThreshold(threshold: Threshold) { return Common.setThreshold(this.#bus, threshold) }

	// async setProfile(profile: FriendlyProfile) {
	// 	const profileExploded = { ...DEFAULT_CHIP_PROFILE, ...profile }
	// 	return Common.setProfile(this.#bus, profileExploded)
	// }
}
