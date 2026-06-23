declare global {
  namespace NodeJS {
    interface ProcessEnv {
        DENOM: string;
        CHAIN_NAME: string;
        GAS_PRICE: string;
        API_URL: string;
        SUDOKU_CONTRACT: string;
    }
  }
}
export {}
