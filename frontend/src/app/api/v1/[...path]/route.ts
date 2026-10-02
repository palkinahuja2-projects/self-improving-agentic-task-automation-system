import { NextRequest, NextResponse } from "next/server";

const getTargetBackendUrl = (): string => {
  const envUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const cleanUrl = envUrl.replace(/\/+$/, "");
  return cleanUrl.endsWith("/api/v1") ? cleanUrl : `${cleanUrl}/api/v1`;
};

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegment = resolvedParams.path ? resolvedParams.path.join("/") : "";
  const targetBase = getTargetBackendUrl();
  const searchParams = request.nextUrl.search;
  const targetUrl = `${targetBase}/${pathSegment}${searchParams}`;

  try {
    const headers = new Headers();
    const forwardHeaders = ["authorization", "content-type", "accept", "x-request-id"];
    
    forwardHeaders.forEach((h) => {
      const val = request.headers.get(h);
      if (val) {
        headers.set(h, val);
      }
    });

    let body: any = undefined;
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      try {
        body = await request.text();
      } catch {
        body = undefined;
      }
    }

    const res = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      cache: "no-store",
    });

    const resData = await res.text();
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(resData);
    } catch {
      parsedJson = null;
    }

    if (parsedJson) {
      return NextResponse.json(parsedJson, {
        status: res.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
        },
      });
    }

    return new NextResponse(resData, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        detail: `Backend connection error: ${error.message || "Unreachable target server"}`,
        status: "error",
      },
      {
        status: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
    },
  });
}
