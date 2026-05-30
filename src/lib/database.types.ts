export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: Database["public"]["Enums"]["audit_action"]
          criado_em: string
          id: number
          registro_id: string
          tabela: string
          user_email: string | null
          user_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["audit_action"]
          criado_em?: string
          id?: number
          registro_id: string
          tabela: string
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["audit_action"]
          criado_em?: string
          id?: number
          registro_id?: string
          tabela?: string
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
      commission_calculations: {
        Row: {
          comissao_calculada: number
          criado_em: string
          criado_por: string | null
          detalhamento: Json
          id: string
          periodo_fim: string
          periodo_inicio: string
          status: Database["public"]["Enums"]["commission_status"]
          total_liquido: number
          total_vendido: number
          vendedor_id: string
        }
        Insert: {
          comissao_calculada?: number
          criado_em?: string
          criado_por?: string | null
          detalhamento?: Json
          id?: string
          periodo_fim: string
          periodo_inicio: string
          status?: Database["public"]["Enums"]["commission_status"]
          total_liquido?: number
          total_vendido?: number
          vendedor_id: string
        }
        Update: {
          comissao_calculada?: number
          criado_em?: string
          criado_por?: string | null
          detalhamento?: Json
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: Database["public"]["Enums"]["commission_status"]
          total_liquido?: number
          total_vendido?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_calculations_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          calculation_id: string
          criado_em: string
          data_pagamento: string
          id: string
          observacoes: string | null
          payable_id: string | null
          responsavel_id: string | null
          valor_pago: number
        }
        Insert: {
          calculation_id: string
          criado_em?: string
          data_pagamento?: string
          id?: string
          observacoes?: string | null
          payable_id?: string | null
          responsavel_id?: string | null
          valor_pago: number
        }
        Update: {
          calculation_id?: string
          criado_em?: string
          data_pagamento?: string
          id?: string
          observacoes?: string | null
          payable_id?: string | null
          responsavel_id?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "commission_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          criado_em: string
          faixa: number
          id: number
          percentual: number
          valor_maximo: number | null
          valor_minimo: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          criado_em?: string
          faixa: number
          id?: number
          percentual: number
          valor_maximo?: number | null
          valor_minimo: number
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          criado_em?: string
          faixa?: number
          id?: number
          percentual?: number
          valor_maximo?: number | null
          valor_minimo?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          data_conclusao_prevista: string | null
          data_conclusao_real: string | null
          data_inicio: string | null
          data_venda: string
          forma_pagamento: Database["public"]["Enums"]["payment_form"]
          id: string
          modelo_emissao_nf: Database["public"]["Enums"]["invoice_emission"]
          observacoes: string | null
          parcelas_personalizadas: Json | null
          percentual_imposto_snapshot: number
          servico: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          valor_bruto: number
          valor_imposto: number
          valor_liquido: number
          vendedor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          data_conclusao_prevista?: string | null
          data_conclusao_real?: string | null
          data_inicio?: string | null
          data_venda?: string
          forma_pagamento: Database["public"]["Enums"]["payment_form"]
          id?: string
          modelo_emissao_nf?: Database["public"]["Enums"]["invoice_emission"]
          observacoes?: string | null
          parcelas_personalizadas?: Json | null
          percentual_imposto_snapshot: number
          servico: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          valor_bruto: number
          valor_imposto: number
          valor_liquido: number
          vendedor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          data_conclusao_prevista?: string | null
          data_conclusao_real?: string | null
          data_inicio?: string | null
          data_venda?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_form"]
          id?: string
          modelo_emissao_nf?: Database["public"]["Enums"]["invoice_emission"]
          observacoes?: string | null
          parcelas_personalizadas?: Json | null
          percentual_imposto_snapshot?: number
          servico?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          valor_bruto?: number
          valor_imposto?: number
          valor_liquido?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          criado_em: string
          id: number
          nome: string
          padrao: boolean
          tipo: string
        }
        Insert: {
          criado_em?: string
          id?: number
          nome: string
          padrao?: boolean
          tipo: string
        }
        Update: {
          criado_em?: string
          id?: number
          nome?: string
          padrao?: boolean
          tipo?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          data_emissao: string | null
          id: string
          numero_nf: string | null
          observacoes: string | null
          receivable_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          data_emissao?: string | null
          id?: string
          numero_nf?: string | null
          observacoes?: string | null
          receivable_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          data_emissao?: string | null
          id?: string
          numero_nf?: string | null
          observacoes?: string | null
          receivable_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          categoria_id: number | null
          commission_payment_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["payable_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: number | null
          commission_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["payable_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: number | null
          commission_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["payable_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payables_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_commission_payment_fkey"
            columns: ["commission_payment_id"]
            isOneToOne: false
            referencedRelation: "commission_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_payments: {
        Row: {
          created_at: string
          data: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          receivable_id: string
          registrado_por: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          receivable_id: string
          registrado_por?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          receivable_id?: string
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_payments_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          data_prevista: string
          data_recebimento: string | null
          id: string
          numero_parcela: number
          observacoes: string | null
          status: Database["public"]["Enums"]["receivable_status"]
          total_parcelas: number
          updated_at: string
          valor_previsto: number
          valor_recebido: number
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          data_prevista: string
          data_recebimento?: string | null
          id?: string
          numero_parcela: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          total_parcelas: number
          updated_at?: string
          valor_previsto: number
          valor_recebido?: number
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          data_prevista?: string
          data_recebimento?: string | null
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          total_parcelas?: number
          updated_at?: string
          valor_previsto?: number
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          percentual_padrao: number | null
          profile_id: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          percentual_padrao?: number | null
          profile_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          percentual_padrao?: number | null
          profile_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          created_by: string | null
          criado_em: string
          id: number
          percentual: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          created_by?: string | null
          criado_em?: string
          id?: number
          percentual: number
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          created_by?: string | null
          criado_em?: string
          id?: number
          percentual?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_commission: {
        Args: { p_fim: string; p_inicio: string; p_vendedor_id: string }
        Returns: string
      }
      current_tax_percentual: { Args: never; Returns: number }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      generate_receivables: { Args: { p_contract_id: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_financeiro_or_admin: { Args: never; Returns: boolean }
      mark_overdue_payables: { Args: never; Returns: number }
      mark_overdue_receivables: { Args: never; Returns: number }
      preview_commission: {
        Args: { p_fim: string; p_inicio: string; p_vendedor_id: string }
        Returns: Json
      }
    }
    Enums: {
      audit_action: "insert" | "update" | "delete"
      commission_status: "pendente" | "pago"
      contract_status: "em_andamento" | "concluido" | "cancelado"
      invoice_emission: "por_parcela" | "encerramento"
      invoice_status: "emitida" | "nao_emitida"
      payable_status: "pendente" | "pago" | "vencido"
      payment_form: "a_vista" | "50_50" | "2x" | "3x" | "personalizado"
      receivable_status: "pendente" | "pago" | "parcial" | "vencido"
      user_role: "admin" | "financeiro" | "comercial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: ["insert", "update", "delete"],
      commission_status: ["pendente", "pago"],
      contract_status: ["em_andamento", "concluido", "cancelado"],
      invoice_emission: ["por_parcela", "encerramento"],
      invoice_status: ["emitida", "nao_emitida"],
      payable_status: ["pendente", "pago", "vencido"],
      payment_form: ["a_vista", "50_50", "2x", "3x", "personalizado"],
      receivable_status: ["pendente", "pago", "parcial", "vencido"],
      user_role: ["admin", "financeiro", "comercial"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
