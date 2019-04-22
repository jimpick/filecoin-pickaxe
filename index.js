#!/usr/bin/env node

import meow from 'meow'
import React, { useState } from 'react'
import { render, Box, Color } from 'ink'
import { CommandRouter, CommandMatch, CommandDefault } from './commandRouter'
import ExitNow from './inkExitNow'
import { groupStart, groupStop } from './group'
import { ConnectGroup } from './groupContext'
import ListBundles from './listBundles'
import AddFileOrDir from './addFileOrDir'
import ImportBundle from './importBundle'
import WatchForExitKey from './inkWatchForExitKey'

const cli = meow(
  `
    Usage
      $ pickaxe <command> [options]

    Quick Start:

      $ pickaxe add <file>
      $ pickaxe import
      $ pickaxe cids

    Commands:

      pickaxe help

        - shows this usage message

      pickaxe init [groupname]

        - creates a new pickaxe group for organizing nodes, and adds
          an entry for this Filecoin node to it

      pickaxe bundle create <bundlename>

        - creates a new "bundle" to manage files from a set of sources

      pickaxe add <file or directory>

        - adds the file or directory as a source in the bundle

      pickaxe import

        - processes all the sources in the bundle and imports
          them into the local Filecoin node. This involves:

          * gets data from sources:
              * reads files / traversing directories
          * importing the data into the local Filecoin node

      pickaxe cids

        - lists the CIDs imported into the local Filecoin node
          for the current bundle

      pickaxe sync

        - stays connected to the network so other machines can
          sync the state (bundles, etc.)
  `,
  {
    flags: {
    }
  }
)

const args = cli.flags
const command = cli.input[0]

if (!command) {
  console.error('Missing command')
  console.error('Run `pickaxe --help` for help')
  process.exit(1)
}

if (command === 'help') {
  cli.showHelp()
}

const Main = () => {
  const [error, setError] = useState()

  if (error) {
    return (
      <Box>
        <Color red>Error: {error}</Color>
        <ExitNow error="Error displayed" />
      </Box>
    )
  }

  return (
    <ConnectGroup>
      <Box flexDirection="column">
        <CommandRouter command={command}>
          <CommandMatch command="add">
            <AddFileOrDir fileOrDir={cli.input[1]} onError={setError} />
          </CommandMatch>
          <CommandMatch command="ls">
            <ListBundles />
          </CommandMatch>
          <CommandMatch command="import">
            <ImportBundle />
          </CommandMatch>
          <CommandMatch command="sync">
            <Box>Syncing via network...</Box>
            <WatchForExitKey />
          </CommandMatch>
          <CommandDefault>
            <Box flexDirection="column">
              <Box>
                <Color red>Didn't recognize command: {command}</Color>
              </Box>
              <Box>Run `pickaxe --help` for help</Box>
              <ExitNow error="Error displayed" />
            </Box>
          </CommandDefault>
        </CommandRouter>
      </Box>
    </ConnectGroup>
  )
}

async function run () {
  await groupStart()

  const { unmount, rerender, waitUntilExit } = render(<Main />)

  process.on('SIGWINCH', () => rerender(<Main />))

  try {
    await waitUntilExit()
    await groupStop()
    process.exit(0)
  } catch (e) {
    if (e.message !== 'Error displayed') {
      console.error(e)
    }
    process.exit(1)
  }
}

run()
