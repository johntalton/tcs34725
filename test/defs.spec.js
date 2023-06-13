import { makeCommand } from '@johntalton/tcs34725'

import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Defs', () => {
	describe('makeCommand', () => {
		it('undefined', () => {
			expect(() => makeCommand()).to.throw()
		})

		it('empty not command', () => {
			const cmd = makeCommand(0, 0, false)
			expect(cmd).to.equal(0)
		})

		it('empty command', () => {
			const cmd = makeCommand(0, 0, true)
			expect(cmd).to.equal(128)
		})

		it('command', () => {
			const cmd = makeCommand(1, 0, true)
			expect(cmd).to.equal(129)
		})
	})
})
