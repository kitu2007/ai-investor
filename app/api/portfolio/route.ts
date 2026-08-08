import { NextRequest, NextResponse } from "next/server";
import { readPortfolio, upsertCompany, deleteCompany } from "@/lib/storage";
import { Company } from "@/lib/types";
import { nanoid } from "@/lib/utils";

export async function GET() {
  try {
    const data = readPortfolio();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company: Company = {
      ...body,
      id: body.id || nanoid(),
      dateAdded: body.dateAdded || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      financialsLastFetched: body.financialsLastFetched || null,
    };
    upsertCompany(company);
    return NextResponse.json(company);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    deleteCompany(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
