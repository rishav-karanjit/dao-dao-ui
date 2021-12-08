import {
  convertMicroDenomToDenom,
  convertFromMicroDenom,
} from 'util/conversion'

function TokenBalance({
  amount,
  denom,
  symbol,
}: {
  amount: string
  denom: string
  symbol?: string
}) {
  symbol = symbol || convertFromMicroDenom(denom)

  return (
    <div className="card bordered shadow-lg card-side mr-2">
      <div className="card-body py-6">
        <h2 className="card-title">{symbol}</h2>
        <p>{convertMicroDenomToDenom(amount)}</p>
        {/* <p>-</p> */}
      </div>
    </div>
  )
}

export default TokenBalance
