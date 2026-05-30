// Tipos PLACEHOLDER permissivos. Após `supabase db reset` + `npm run db:types`
// este arquivo será sobrescrito com os tipos reais e estritos do schema.
// Mantemos um shape genérico para que o client `supabase` não infira `never`
// nas tabelas durante o desenvolvimento.
/* eslint-disable @typescript-eslint/no-explicit-any */

type LooseTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: { [k: string]: LooseTable };
    Views: { [k: string]: LooseTable };
    Functions: { [k: string]: { Args: Record<string, any>; Returns: any } };
    Enums: { [k: string]: string };
    CompositeTypes: Record<string, never>;
  };
};
