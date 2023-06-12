export type Configuration = {
	wlong: boolean
}

export type WaitTiming = {
  wtime: number,
  count: number
}

export type IntegrationTimingParts = {
	_atime: number,
	integrationCycles: number,
	integrationMaxCount: number,
	integrationTimeMs: number
}

export type Persistence = {
	apres: number
}

export type Status = {
	valid: boolean,
	thresholdViolation: boolean
}

export type Control = {
	again: number
}

export type Threshold = {
	high: number,
	low: number
}

export type Enable = {
	powerOn: boolean,
	active: boolean,
	wait: boolean,
	interrupts: boolean
}

export type RGBC = {
	r: number,
	g: number,
	b: number,
	c?: number,

	zero?: boolean
}


export type RGBCRatio = RGBC

export type LuxAndTemperature = {
	lux: number,
	temperatureK: number
}

export type Data = LuxAndTemperature & {
	raw: RGBC,
	ratio: RGBCRatio,
	rgb: RGBC
}

export type ProfileParts = [
		enable: Enable,
		integrationTiming: IntegrationTimingParts,
		waitTiming: WaitTiming,
		threshold: Threshold,
		persistence: Persistence,
		config: Configuration,
		control: Control,
		status: Status
	]

export type CommonProfile = Enable & {
	integrationTimeMs: number,
	waitTimeMs: number,
}

export type Profile = CommonProfile & {
	low: number,
	high: number,
	filtering: boolean|number,
	gain: number
}

export type FriendlyProfile = CommonProfile & {
	threshold: Threshold
	filtering: boolean,
	gain: number
}
