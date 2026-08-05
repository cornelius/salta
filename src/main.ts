import { mount } from './ui/app'

const root = document.querySelector<HTMLElement>('#app')
if (root === null) throw new Error('no #app element to mount into')
mount(root)
