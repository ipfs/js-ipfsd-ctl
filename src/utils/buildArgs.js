'use strict'

const buildStartArgs = (controller) => {
  const args = ['daemon']
  const opts = controller.opts.ipfsOptions
  // add custom args
  args.push(...controller.opts.args)

  if (opts.pass && controller.opts.type === 'js') {
    args.push('--pass', '"' + opts.pass + '"')
  }
  if (opts.offline) {
    args.push('--offline')
  }
  if (opts.preload && controller.opts.type === 'js') {
    args.push('--enable-preload', Boolean(opts.preload.enabled))
  }
  if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.sharding) {
    args.push('--enable-sharding-experiment')
  }
  if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.ipnsPubsub) {
    args.push('--enable-namesys-pubsub')
  }
  if (opts.repoAutoMigrate) {
    args.push('--migrate')
  }

  return args
}

module.exports = {
  buildStartArgs
}
