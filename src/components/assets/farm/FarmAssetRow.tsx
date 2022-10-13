import React, { useContext, useEffect } from 'react'
import { CurrencyLogoFromList } from 'components/CurrencyLogo/CurrencyLogoFromList'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { Emission, EmissionText, PoolPair, PoolRow, RowColumn } from 'components/farm/FarmTable'
import { AutoRow } from 'components/Row'
import { BIG_INT_SECONDS_IN_WEEK } from 'constants/misc'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import JSBI from 'jsbi'
import { CurrencyAmount } from 'sdk-core/entities'
import { MinichefRawPoolInfo, usePairTokens, useRewardInfos } from 'state/farm/farm-hooks'
import { useActiveWeb3React } from 'hooks/web3'
import { AssetContext } from 'contexts/assets/AssetContext'
import { AssetActions } from 'contexts/assets/assets.constants'
import { USDCValue } from '../shared/USDCValue'
import Loader from 'components/Loader'

const FarmAssetRow = ({
  lpTokenAddress,
  poolId,
  rewarderAddress,
  stakedRawAmount,
  poolEmissionAmount,
}: MinichefRawPoolInfo) => {
  const { account } = useActiveWeb3React()
  const { dispatch: assetsDispatch } = useContext(AssetContext)

  const { totalPoolStaked, pair, lpToken } = usePairTokens(lpTokenAddress)
  const { rewardPerSecondAmount } = useRewardInfos(poolId, rewarderAddress)

  const stakedAmount = lpToken ? CurrencyAmount.fromRawAmount(lpToken, stakedRawAmount || 0) : undefined

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolStaked &&
    !!stakedAmount &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolStaked.quotient, stakedAmount.quotient)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolStaked, stakedAmount, false),
          pair.getLiquidityValue(pair.token1, totalPoolStaked, stakedAmount, false),
        ]
      : [undefined, undefined]

  const token0Value = useUSDCValue(token0Deposited)
  const token1Value = useUSDCValue(token1Deposited)

  const positionValue = token0Value?.multiply(2) || token1Value?.multiply(2)
  const positionValueNumber = positionValue?.toSignificant(4)

  useEffect(() => {
    if (positionValue) {
      assetsDispatch({
        type: AssetActions.ADD_VALUE,
        list: 'farmValues',
        payload: { [lpTokenAddress]: positionValueNumber },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lpTokenAddress, assetsDispatch, positionValueNumber])

  if (!positionValue?.greaterThan(0)) {
    return null
  }

  return (
    <PoolRow to={`/farm/${poolId}`}>
      <AutoRow gap="0%" justify={'space-between'}>
        <PoolPair>
          <DoubleCurrencyLogo currency0={pair?.token0} currency1={pair?.token1} size={36} />
          <span style={{ marginLeft: '10px' }}>
            {pair?.token0.symbol}/{pair?.token1.symbol}
          </span>
        </PoolPair>
        <RowColumn>{stakedAmount?.toSignificant()}</RowColumn>
        <RowColumn>
          <Emission>
            <EmissionText>
              {poolEmissionAmount?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' }) ?? '-'}
            </EmissionText>
            <CurrencyLogoFromList
              currency={poolEmissionAmount?.currency}
              title={rewardPerSecondAmount?.currency.symbol}
            />
          </Emission>
          {rewardPerSecondAmount && (
            <Emission>
              <EmissionText>
                {rewardPerSecondAmount?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' }) ?? '-'}
              </EmissionText>
              <CurrencyLogoFromList
                currency={rewardPerSecondAmount?.currency}
                title={rewardPerSecondAmount?.currency.symbol}
              />
            </Emission>
          )}
        </RowColumn>
        <RowColumn>{positionValue ? <USDCValue amount={positionValue} /> : account ? <Loader /> : null}</RowColumn>
      </AutoRow>
    </PoolRow>
  )
}

export default FarmAssetRow
