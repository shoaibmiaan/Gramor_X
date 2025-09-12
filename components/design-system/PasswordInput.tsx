import * as React from 'react'
import { Input } from './Input'
import type { InputProps } from './Input'
export const PasswordInput: React.FC<InputProps> = (props) => <Input {...props} type="password" passwordToggle />
export default PasswordInput
