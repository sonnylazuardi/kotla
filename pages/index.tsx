import { Grid } from '@geist-ui/core'
import type { NextPage } from 'next'

const Home: NextPage = () => {
  return (
    <Grid.Container gap={2}>
      <Grid xs={0} sm={4} />
      <Grid xs={24} sm={16}>
        Hello world
      </Grid>
      <Grid xs={0} sm={4} />
    </Grid.Container>
  )
}

export default Home
