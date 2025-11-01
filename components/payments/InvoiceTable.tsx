import * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/design-system';
import { Badge } from '@/components/design-system/Badge';

export type Invoice = Readonly<{
  id: string;
  amount: number;           // minor units
  currency: string;         // 'PKR' | 'USD' | etc.
  createdAt: string;        // ISO
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
}>;

export type InvoiceTableProps = {
  invoices: Invoice[];
  className?: string;
};

export default function InvoiceTable({ invoices, className = '' }: InvoiceTableProps) {
  return (
    <TableContainer className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!invoices || invoices.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted">
                No invoices yet.
              </TableCell>
            </TableRow>
          )}
          {invoices?.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="text-text">
                <time dateTime={inv.createdAt} suppressHydrationWarning>
                  {new Date(inv.createdAt).toLocaleDateString()}
                </time>
              </TableCell>
              <TableCell className="tabular-nums text-text">
                {(inv.amount / 100).toLocaleString(undefined, {
                  style: 'currency',
                  currency: inv.currency,
                })}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    inv.status === 'paid'
                      ? 'success'
                      : inv.status === 'open'
                        ? 'accent'
                        : 'warning'
                  }
                  size="xs"
                  className="capitalize"
                >
                  {inv.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {inv.hostedInvoiceUrl ? (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-4 hover:text-accent/80"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption className="text-left">
          Billing amounts are displayed in your billing currency.
        </TableCaption>
      </Table>
    </TableContainer>
  );
}
